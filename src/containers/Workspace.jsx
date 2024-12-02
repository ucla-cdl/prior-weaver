import React, { useState, useRef, useEffect } from 'react';
import "./Workspace.css";
import { Button, Box, Select, MenuItem, Grid2, InputLabel, FormControl, Tabs, Tab, Typography, MenuList, Paper, BottomNavigation, BottomNavigationAction, Tooltip } from '@mui/material';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';
import ConceptualModel from '../components/ConceptualModel';
import HelpIcon from '@mui/icons-material/Help';
import ParallelSankeyPlot from '../components/ParallelSankeyPlot';

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

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const [variablesDict, setVariablesDict] = useState({});
    const [selectedVarName, setSelectedVarName] = useState('');
    const [selectedVariable, setSelectedVariable] = useState('');
    const [bivariateVarName1, setBivariateVarName1] = useState('');
    const [bivariateVarName2, setBivariateVarName2] = useState('');
    const [biVariableDict, setBiVariableDict] = useState({});

    const [studyContext, setStudyContext] = useState(context["human_growth_model"]);

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

    const handleSelectedVariableChange = (event, value) => {
        console.log("select", value)
        setSelectedVarName(value);
        setSelectedVariable(variablesDict[value]);
    };

    const handleSelectBiVar1 = (event) => {
        setBivariateVarName1(event.target.value);
    }

    const handleSelectBiVar2 = (event) => {
        setBivariateVarName2(event.target.value);
    }

    const selectBivariable = (biVarName) => {
        let [varName, relatedVarName] = biVarName.split("-");
        setBivariateVarName1(varName);
        setBivariateVarName2(relatedVarName);
    }


    return (
        <div className='workspace-div'>
            {/* <Grid2 sx={{ my: 2 }} container spacing={3}>
                <Grid2 className="module-div" size={4}>
                    <h3>Tasks</h3>

                </Grid2>
                <Grid2 className="module-div" size={8}>
                    <h3>Analysis Context</h3>
                    <Typography>
                        {studyContext}
                    </Typography>
                </Grid2>
            </Grid2> */}

            <Box className="module-div" sx={{ width: "100%", my: 2 }}>
                <h3>Analysis Context</h3>
                <Typography>
                    {studyContext}
                </Typography>
                {/* <Typography sx={{my: 1, fontWeight: 'bold'}}>
                    Please provide the distribution for statures of males.
                    Please provide the distributuion for monthly income.
                </Typography> */}
            </Box>


            <ConceptualModel
                variablesDict={variablesDict}
                setVariablesDict={setVariablesDict}
                biVariableDict={biVariableDict}
                setBiVariableDict={setBiVariableDict}
                updateVariable={updateVariable}
                updateBivariable={updateBivariable}
                selectBivariable={selectBivariable}
            />

            <Box className="module-div" sx={{ width: "100%", my: 2 }}>
                <h3>Parallel Sankey Plot</h3>
                <ParallelSankeyPlot variablesDict={variablesDict} />
            </Box>

            <Grid2 sx={{ my: 2 }} container spacing={3}>
                <Grid2 className="module-div" size={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3>
                            Bivariate Relationship
                            <Tooltip
                                title={
                                    <React.Fragment>
                                        <b>{'Predict Mode'}</b>: {'Draw a trending line.'}<br />
                                        <b>{'Populate Mode'}</b>: {'Adding data points.\n'}<br />
                                        <b>{'Chip Mode'}</b>: {'Combine marginal data points.\n'}<br />
                                        <br />
                                        <b>{'Click'}</b> {'to add a point or '} <b>{'Double Click'}</b> {'to delete a point.'}
                                    </React.Fragment>
                                }>
                                <HelpIcon fontSize="small" style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
                            </Tooltip>
                        </h3>

                        {/* <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: "center" }}>
                            <FormControl sx={{ m: 1, minWidth: 120 }}>
                                <InputLabel id="var-1-label">Variable 1</InputLabel>
                                <Select
                                    labelId='var-1-label'
                                    value={bivariateVarName1}
                                    label="Variable 1"
                                    onChange={handleSelectBiVar1}
                                >
                                    {Object.entries(variablesDict).map(([varName, curVar], i) => {
                                        return (
                                            <MenuItem disabled={varName === bivariateVarName2} key={i} value={varName}>{varName}</MenuItem>
                                        )
                                    })}
                                </Select>
                            </FormControl>
                            <FormControl sx={{ m: 1, minWidth: 120 }}>
                                <InputLabel id="var-2-label">Variable 2</InputLabel>
                                <Select
                                    labelId='var-2-label'
                                    value={bivariateVarName2}
                                    label="Variable 2"
                                    onChange={handleSelectBiVar2}
                                >
                                    {Object.entries(variablesDict).map(([varName, curVar], i) => {
                                        return (
                                            <MenuItem disabled={varName === bivariateVarName1} key={i} value={varName}>{varName}</MenuItem>
                                        )
                                    })}
                                </Select>
                            </FormControl>
                        </Box> */}

                        {bivariateVarName1 !== '' && bivariateVarName2 !== '' ?
                            <BiVariablePlot
                                biVariableDict={biVariableDict}
                                biVariable1={variablesDict[bivariateVarName1]}
                                biVariable2={variablesDict[bivariateVarName2]}
                                updateVariable={updateVariable}
                                updateBivariable={updateBivariable} />
                            :
                            <></>}
                    </Box>
                </Grid2>

                <Grid2 size={6}>
                    <Box className="module-div" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3>Univariate Distributions</h3>
                        <Tabs
                            value={selectedVarName}
                            onChange={handleSelectedVariableChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ my: 2 }}
                        >
                            {Object.entries(variablesDict).map(([varName, curVar], i) => {
                                return (
                                    <Tab key={i} label={varName} value={varName} />
                                )
                            })}
                        </Tabs>
                        {Object.entries(variablesDict).map(([varName, curVar], i) => {
                            return (
                                <Box key={varName} sx={{ width: '100%', height: '100%' }}>
                                    {selectedVarName === varName ?
                                        <VariablePlot variable={curVar} updateVariable={updateVariable} />
                                        :
                                        <></>
                                    }
                                </Box>
                            )
                        })}
                    </Box>
                </Grid2>
            </Grid2>
        </div>
    );
};
