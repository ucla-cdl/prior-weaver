import React, { useState, useRef, useEffect } from 'react';
import "./Workspace.css";
import { Button, Box, Select, MenuItem, Grid2, Backdrop, CircularProgress, InputLabel, FormControl, Tabs, Tab, Typography, MenuList, Paper, BottomNavigation, BottomNavigationAction, Tooltip, Grid, IconButton } from '@mui/material';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';
import ConceptualModel from '../components/ConceptualModel';
import BrushIcon from '@mui/icons-material/Brush';
import ParallelSankeyPlot from '../components/ParallelSankeyPlot';
import { v4 as uuidv4 } from 'uuid';
import ResultsPanel from '../components/ResultsPanel';

const context = {
    "human_growth_model": "During the early stages of life the stature of female and male are about the same,\
                but their stature start to clearly to differ during growth and in the later stages of life.\
                In the early stage man and female are born roughly with the same stature, around 45cm - 55cm.\
                By the time they are born reaching around 2.5 years old, both male and female present the highest growth rate (centimetres pey year).\
                It is the time they grow the fastest. During this period, man has higher growth rate compared to female.\
                For both male and female there is a spurt growth in the pre-adulthood.\
                For man, this phase shows fast growth rate varying in between 13-17 years old and female varying from 11-15.\
                Also, male tend to keep growing with roughly constant rate until the age of 17-18, while female with until the age of 15-16.\
                After this period of life they tend to stablish their statures mostly around 162 - 190cm and 155 - 178cm respectively.",

    "income_education_age": "Imagine you are a social scientist interested in understanding the factors that influence people's income.\
                Specifically, you want to assess how the number of years of education and a person's age (or employment years) impact their monthly income in the U.S.\
                You aim to use this information to better understand socioeconomic patterns and inform policy recommendations.",
}

const RELATIONS = ["causes", "associates with", "not related to"];

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const bivarRef = useRef();

    const [variablesDict, setVariablesDict] = useState({});
    const [selectedVarName, setSelectedVarName] = useState('');
    const [selectedVariable, setSelectedVariable] = useState('');
    const [bivariateVarName1, setBivariateVarName1] = useState('');
    const [bivariateVarName2, setBivariateVarName2] = useState('');
    const [biVariableDict, setBiVariableDict] = useState({});

    const [entities, setEntities] = useState({});

    const [studyContext, setStudyContext] = useState(context["income_education_age"]);

    const updateVariable = (name, key, value) => {
        console.log("update variable", name, key, value);
        setVariablesDict(prev => ({
            ...prev,
            [name]: { ...prev[name], [key]: value }
        }));
    }

    const updateBivariable = (name, key, value) => {
        console.log("update bivariable", name, key, value);
        setBiVariableDict(prev => ({
            ...prev,
            [name]: { ...prev[name], [key]: value }
        }));
    }

    // Add an attribute to every entity when adding a variable
    const addAttributeToEntities = (varName) => {
        console.log("Add an Attribute To Entities", varName);
        let newEntities = { ...entities };
        Object.keys(newEntities).forEach((id) => {
            newEntities[id][varName] = null;
        });
        setEntities(newEntities);
    }

    /**
     * Create a new entities using a dictonary contains data as key-value pairs for each variable
     */
    const addEntities = (entitiesData) => {
        console.log("add entities", entitiesData);
        setEntities((prev) => {
            let newEntities = { ...prev };
            entitiesData.forEach((entityData) => {
                // Create a new entity with a unique ID and key-value pairs for each variable
                let newEntity = {
                    id: uuidv4()
                };
                Object.keys(variablesDict).forEach((key) => {
                    newEntity[key] = null;
                });
                Object.entries(entityData).forEach(([key, value]) => {
                    newEntity[key] = value;
                });

                newEntities[newEntity.id] = newEntity;
            });

            return newEntities;
        });
    }

    const deleteEntities = (entitiesIDs) => {
        console.log("delete entities", entitiesIDs);

        setEntities((prev) => {
            let newEntities = { ...prev };
            entitiesIDs.forEach((entityID) => {
                delete newEntities[entityID];
            });

            return newEntities;
        });
    }

    // Update the entities with new data
    const updateEntities = (entitiesIDs, entitiesData) => {
        console.log("update entities", entitiesIDs, entitiesData);
        let newEntities = { ...entities };
        entitiesIDs.forEach((entityID, i) => {
            let entityData = entitiesData[i];
            let newEntity = { ...newEntities[entityID] };
            Object.entries(entityData).forEach(([key, value]) => {
                newEntity[key] = value;
            });
            newEntities[entityID] = newEntity;
        });

        console.log("new", newEntities)
        setEntities(newEntities);
    }

    const selectBivariable = (biVarName) => {
        let [varName, relatedVarName] = biVarName.split("-");
        setBivariateVarName1(varName);
        setBivariateVarName2(relatedVarName);
    }

    // Synchronize the selection of entities in multiple views
    const synchronizeSankeySelection = (selectedEntities) => {
        console.log("synchronizeSankeySelection", selectedEntities);
        bivarRef.current?.synchronizeSelection(selectedEntities);
    }

    const loadData = () => {
        fetch("/synthetic_dataset.json")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch the dataset");
                }
                return response.json();
            })
            .then((data) => addEntities(data))
            .catch((error) => console.error("Error loading dataset:", error));
    }

    return (
        <div className='workspace-div'>
            {/* 
                    UI LAYOUT:
                    
                    Analysis Context | Variables | Conceptual Model

                    Parallel Sankey Plot | Bivariate Relationship

                    Univariate Distributions
                    
                    Results Panel
                */}
            <Grid2 sx={{ my: 1 }} container spacing={3}>
                <Grid2 className="module-div" size={4}>
                    <h3>Analysis Context</h3>
                    <Typography>
                        {studyContext}
                    </Typography>
                </Grid2>

                <Grid2 size={8}>
                    <ConceptualModel
                        variablesDict={variablesDict}
                        setVariablesDict={setVariablesDict}
                        biVariableDict={biVariableDict}
                        setBiVariableDict={setBiVariableDict}
                        updateVariable={updateVariable}
                        updateBivariable={updateBivariable}
                        selectBivariable={selectBivariable}
                        addAttributeToEntities={addAttributeToEntities}
                    />
                </Grid2>
            </Grid2>

            <Grid2 sx={{ my: 1 }} container spacing={3}>
                <Grid2 className="module-div" size={8}>
                    <h3>Parallel Coordinates Plot</h3>
                    <ParallelSankeyPlot
                        variablesDict={variablesDict}
                        updateVariable={updateVariable}
                        entities={entities}
                        addEntities={addEntities}
                        deleteEntities={deleteEntities}
                        updateEntities={updateEntities}
                        synchronizeSankeySelection={synchronizeSankeySelection}
                    />
                </Grid2>
                <Grid2 className="module-div" size={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3>
                            Bivariate Relationship
                        </h3>

                        {/* Relation List */}
                        <Box sx={{ overflowY: 'auto', maxHeight: 150 }}>
                            {Object.entries(biVariableDict).map(([biVarName, biVariable]) => {
                                let [varName, relatedVarName] = biVarName.split("-");
                                return (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            color: biVariable.specified ? 'green' : 'grey'
                                        }}
                                        key={biVarName}
                                    >
                                        <p><strong>
                                            {varName}&nbsp;&nbsp;&nbsp;
                                        </strong></p>
                                        <FormControl sx={{ minWidth: 120 }}>
                                            <Select
                                                value={biVariable.relation}
                                                onChange={(e) => updateBivariable(biVarName, "relation", e.target.value)}
                                                displayEmpty
                                                inputProps={{ 'aria-label': 'Without label' }}
                                                sx={{
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        border: 'none',
                                                    },
                                                    '& .MuiSelect-select': {
                                                        padding: '4px 8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    },
                                                }}
                                            >
                                                {RELATIONS.map((relation) => (
                                                    <MenuItem key={relation} value={relation}>
                                                        {relation}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <p><strong>
                                            &nbsp;&nbsp;&nbsp;{relatedVarName}
                                        </strong></p>
                                        <IconButton sx={{ mx: 1 }} onClick={() => selectBivariable(biVarName)}>
                                            <BrushIcon fontSize='small' />
                                        </IconButton>
                                    </Box>
                                );
                            })}
                        </Box>

                        {bivariateVarName1 !== '' && bivariateVarName2 !== '' ?
                            <BiVariablePlot
                                ref={bivarRef}
                                biVariableDict={biVariableDict}
                                biVariable1={variablesDict[bivariateVarName1]}
                                biVariable2={variablesDict[bivariateVarName2]}
                                updateVariable={updateVariable}
                                updateBivariable={updateBivariable}
                                entities={entities}
                            />
                            :
                            <></>}
                    </Box>
                </Grid2>
            </Grid2>

            <Box className="module-div" sx={{ width: "100%", my: 1 }}>
                <h3>Univariate Distributions</h3>
                <Box sx={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', justifyContent: 'center' }}>
                    {Object.entries(variablesDict).map(([varName, curVar], i) => {
                        return (
                            <VariablePlot
                                key={i}
                                variable={curVar}
                                updateVariable={updateVariable}
                                entities={entities}
                                addEntities={addEntities}
                                updateEntities={updateEntities}
                            />
                        )
                    })}
                </Box>
            </Box>

            <Grid2 sx={{ my: 1 }} container spacing={3}>
                <Box className="module-div" sx={{ width: "100%", my: 1 }}>
                    <h3>Results Panel</h3>
                    <ResultsPanel entities={entities} variablesDict={variablesDict} />
                </Box>
            </Grid2>
        </div>
    );
};
