import React, { useState, useRef, useEffect } from 'react';
import "./Workspace.css";
import { Button, Box, Select, MenuItem, Grid2, Backdrop, CircularProgress, InputLabel, FormControl, Tabs, Tab, Typography, MenuList, Paper, BottomNavigation, BottomNavigationAction, Tooltip, IconButton, TextField, Slide } from '@mui/material';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';
import ConceptualModel from '../components/ConceptualModel';
import BrushIcon from '@mui/icons-material/Brush';
import ParallelSankeyPlot from '../components/ParallelSankeyPlot';
import { v4 as uuidv4 } from 'uuid';
import ResultsPanel from '../components/ResultsPanel';
import axios from 'axios';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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

const RELATIONS = {
    INFLUENCE: "influences",
    ASSOCIATE: "associates with",
    NONE: "not related to",
};

const DEFAULT_VARIABLE_ATTRIBUTES = {
    min: 0,
    max: 100,
    unitLabel: "",
}

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const bivarRef = useRef();

    const [finishParseCode, setFinishParseCode] = useState(false);
    const [stanCode, setStanCode] = useState('model <- glm(income ~ age + education, family = binomial(link = "logit"))');

    const [model, setModel] = useState('');

    const [variablesDict, setVariablesDict] = useState({});
    const [parametersDict, setParametersDict] = useState({});

    const [bivariateVarName1, setBivariateVarName1] = useState('');
    const [bivariateVarName2, setBivariateVarName2] = useState('');
    const [biVariableDict, setBiVariableDict] = useState({});

    const [entities, setEntities] = useState({});
    const [selectedEntities, setSelectedEntities] = useState([]);

    const [scenario, setScenario] = useState(context["income_education_age"]);

    const [activePanel, setActivePanel] = useState('left');

    useEffect(() => {
        console.log("Workspace mounted - Backend at ", window.BACKEND_ADDRESS);
    }, []);

    const addVariable = (data) => {
        updateVariable(data.name, data);

        const paramName = `p_${data.name}`;
        setParametersDict((prev) => ({
            ...prev,
            [paramName]: {
                name: paramName,
                relatedVar: data.name,
            }
        }));
    }

    const updateVariable = (name, updates) => {
        console.log("update variable", name, updates);
        let finalUpdates = { ...updates };

        // If min or max is updated, recalculate bin edges
        if ('min' in updates || 'max' in updates) {
            const currentVar = variablesDict[name] || {};
            const newMin = updates.min ?? currentVar.min;
            const newMax = updates.max ?? currentVar.max;

            // Create 10 equally spaced bins
            const binCount = 10;
            const step = (newMax - newMin) / binCount;
            const binEdges = Array.from({ length: binCount + 1 }, (_, i) => newMin + step * i);

            finalUpdates.binEdges = binEdges;
        }

        setVariablesDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...finalUpdates }
        }));
    }

    const updateBivariable = (name, updates) => {
        console.log("update bivariable", name, updates);
        setBiVariableDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...updates }
        }));
    }

    const handleStanCode = () => {
        axios.post(window.BACKEND_ADDRESS + '/getStanCodeInfo', {
            code: stanCode
        })
            .then((response) => {
                console.log(response.data);
                const codeInfo = response.data.code_info;
                /**
                 * Parse GLM code
                 * 
                 * Format:
                 * {
                 *  'code': 'model <- glm(outcome ~ age + gender, family = binomial(link = "logit"))',
                 *  'formula': 'outcome ~ age + gender', 
                 *  'response': 'outcome', 
                 *  'predictors': ['age', 'gender'], 
                 *  'family': 'binomial', 
                 *  'link': 'logit'
                 * }
                 */
                Object.entries(codeInfo).forEach(([section, sectionInfo]) => {
                    switch (section) {
                        case "response":
                            updateVariable(sectionInfo, {
                                name: sectionInfo,
                                type: "response",
                                min: DEFAULT_VARIABLE_ATTRIBUTES.min,
                                max: DEFAULT_VARIABLE_ATTRIBUTES.max,
                                unitLabel: DEFAULT_VARIABLE_ATTRIBUTES.unitLabel,
                                sequenceNum: 0
                            });
                            break;
                        case "predictors":
                            console.log("PREDICTORS", sectionInfo);
                            sectionInfo.forEach((predictor, index) => {
                                addVariable({
                                    name: predictor,
                                    type: "predictor",
                                    min: DEFAULT_VARIABLE_ATTRIBUTES.min,
                                    max: DEFAULT_VARIABLE_ATTRIBUTES.max,
                                    unitLabel: DEFAULT_VARIABLE_ATTRIBUTES.unitLabel,
                                    sequenceNum: index + 1
                                });
                            });
                            break;
                        case "code":
                            setModel(sectionInfo);
                            break;
                        default:
                            break;
                    }
                });

                // Add Extra parameters
                setParametersDict((prev) => ({ ...prev, 'intercept': { name: 'intercept', relatedVar: 'intercept' } }));

                // Add bivariate relationship
                let predictors = codeInfo['predictors'];
                let responseVar = codeInfo['response'];
                predictors.forEach((predictor1, index1) => {
                    let biVarName = `${predictor1}-${responseVar}`;
                    console.log("BIVARIABLE", predictor1, biVarName);
                    updateBivariable(biVarName, {
                        name: biVarName,
                        relation: RELATIONS.INFLUENCE,
                        specified: false,
                        predictionDots: [],
                        populateDots: [],
                        chipDots: [],
                        fittedRelation: {},
                    });

                    predictors.forEach((predictor2, index2) => {
                        if (index1 < index2) {
                            biVarName = `${predictor1}-${predictor2}`;
                            console.log("BIVARIABLE", predictor2, biVarName);
                            updateBivariable(biVarName, {
                                name: biVarName,
                                relation: RELATIONS.ASSOCIATE,
                                specified: false,
                                predictionDots: [],
                                populateDots: [],
                                chipDots: [],
                                fittedRelation: {},
                            });
                        }
                    });
                });
            })
            .finally(() => {
                console.log("FINISH PARSE CODE", biVariableDict);
                setFinishParseCode(true);
            })
            .catch((error) => {
                console.log(error);
            });
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
        let newEntities = { ...entities };
        entitiesIDs.forEach((entityID) => {
            delete newEntities[entityID];
        });
        setEntities(newEntities);
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

        newEntities = Object.fromEntries(
            Object.entries(newEntities).filter(([id, entity]) =>
                Object.values(entity).some(value => value !== null)
            )
        );

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

    return (
        <div className='workspace-div'>
            {!finishParseCode ? (
                // Stage 1: Setup
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    maxWidth: '600px',
                    margin: '0 auto',
                    padding: '20px'
                }}>
                    <Typography variant="h4" gutterBottom>
                        Scenario
                    </Typography>
                    <Typography paragraph sx={{ mb: 4 }}>
                        {scenario}
                    </Typography>
                    <Typography paragraph>
                        Please input your model in R code.
                    </Typography>
                    <TextField
                        id="stan-code"
                        label="R Code"
                        multiline
                        rows={3}
                        variant="outlined"
                        fullWidth
                        sx={{ my: 2 }}
                        value={stanCode}
                        onChange={(e) => setStanCode(e.target.value)}
                    />
                    <Button
                        disabled={!stanCode}
                        onClick={handleStanCode}
                        variant="contained"
                        size="large"
                    >
                        Continue
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', position: 'relative' }}>
                    {/* Left Panel */}
                    <Box
                        className="panel left-panel"
                        sx={{
                            display: activePanel === 'left' ? 'block' : 'none',
                            position: 'relative'
                        }}
                    >
                        {/* <div className="component-container">
                            <Typography variant="h6" gutterBottom>Scenario</Typography>
                            <Typography>{scenario}</Typography>
                        </div> */}

                        <div className="context-container">
                            <Typography variant="h6" gutterBottom>Model</Typography>
                            <Typography>{model}</Typography>
                        </div>

                        <div className="context-container">
                            <ConceptualModel
                                variablesDict={variablesDict}
                                updateVariable={updateVariable}
                                setVariablesDict={setVariablesDict}
                                biVariableDict={biVariableDict}
                                setBiVariableDict={setBiVariableDict}
                                updateBivariable={updateBivariable}
                                selectBivariable={selectBivariable}
                                addAttributeToEntities={addAttributeToEntities}
                            />
                        </div>

                        {/* Add Relationship List here */}
                        <div className="context-container">
                            <Typography variant="h6" gutterBottom>Relationship List</Typography>
                            <Box sx={{ overflowY: 'auto', maxHeight: 200 }}>
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
                                            <p><strong>{varName}&nbsp;&nbsp;&nbsp;-</strong></p>
                                            <p><strong>&nbsp;&nbsp;&nbsp;{relatedVarName}</strong></p>
                                            <IconButton sx={{ mx: 1 }} onClick={() => selectBivariable(biVarName)}>
                                                <BrushIcon fontSize='small' />
                                            </IconButton>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </div>
                    </Box>

                    {/* Left Panel Toggle Button - shown when left panel is closed */}
                    {activePanel === 'right' && (
                        <IconButton
                            sx={{
                                position: 'fixed',
                                left: '0',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'white',
                                '&:hover': { backgroundColor: '#f0f0f0' },
                                boxShadow: 2,
                                zIndex: 1000,
                                width: '24px',
                                height: '48px',
                                borderRadius: '0 4px 4px 0'
                            }}
                            onClick={() => setActivePanel('left')}
                        >
                            <ChevronRightIcon />
                        </IconButton>
                    )}

                    {/* Center Panel */}
                    <Box className="panel center-panel" sx={{ flex: 1 }}>
                        {/* Univariate and Bivariate Plots */}
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
                            <div className="component-container univariate-container">
                                <Typography variant="h6" gutterBottom>Univariate Distributions</Typography>
                                <Box sx={{
                                    boxSizing: 'border-box',
                                    height: 'calc(100% - 32px)',
                                    display: 'flex',
                                    overflowX: 'auto'
                                }}>
                                    {Object.entries(variablesDict).sort((a, b) => a[1].sequenceNum - b[1].sequenceNum).map(([varName, curVar], i) => (
                                        <VariablePlot
                                            key={i}
                                            variablesDict={variablesDict}
                                            variable={curVar}
                                            updateVariable={updateVariable}
                                            entities={entities}
                                            addEntities={addEntities}
                                            updateEntities={updateEntities}
                                            deleteEntities={deleteEntities}
                                        />
                                    ))}
                                </Box>
                            </div>
                            <div className="component-container bivariate-container">
                                <Typography variant="h6" gutterBottom>Bivariate Relationship</Typography>
                                <Box sx={{
                                    boxSizing: 'border-box',
                                    height: 'calc(100% - 32px)',
                                }}>
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
                            </div>
                        </Box>

                        {/* Parallel Coordinates Plot */}
                        <Box className="component-container parallel-plot-container">
                            <Typography variant="h6" gutterBottom>Parallel Coordinates Plot</Typography>
                            <Box sx={{
                                boxSizing: 'border-box',
                                height: 'calc(100% - 32px)'
                            }}>
                                <ParallelSankeyPlot
                                    activePanel={activePanel}
                                    variablesDict={variablesDict}
                                    updateVariable={updateVariable}
                                    entities={entities}
                                    addEntities={addEntities}
                                    deleteEntities={deleteEntities}
                                    updateEntities={updateEntities}
                                    synchronizeSankeySelection={synchronizeSankeySelection}
                                />
                            </Box>
                        </Box>
                    </Box>

                    {/* Right Panel Toggle Button - shown when right panel is closed */}
                    {activePanel === 'left' && (
                        <IconButton
                            sx={{
                                position: 'fixed',
                                right: '0',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'white',
                                '&:hover': { backgroundColor: '#f0f0f0' },
                                boxShadow: 2,
                                zIndex: 1000,
                                width: '24px',
                                height: '48px',
                                borderRadius: '4px 0 0 4px'
                            }}
                            onClick={() => setActivePanel('right')}
                        >
                            <ChevronLeftIcon />
                        </IconButton>
                    )}

                    {/* Right Panel */}
                    <Box
                        className="panel right-panel"
                        sx={{
                            display: activePanel === 'right' ? 'block' : 'none',
                            position: 'relative'
                        }}
                    >
                        <div className="component-container results-container">
                            <Typography variant="h6" gutterBottom>Results Panel</Typography>
                            <Box sx={{
                                boxSizing: 'border-box',
                                height: 'calc(100% - 32px)'
                            }}>
                                <ResultsPanel
                                    entities={entities}
                                    variablesDict={variablesDict}
                                    parametersDict={parametersDict}
                                />
                            </Box>
                        </div>
                    </Box>
                </Box>
            )}
        </div>
    );
};
