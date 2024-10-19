import React, { useState, useRef, useEffect } from 'react';
import "./Workspace.css";
import { Button, Box, Select, MenuItem, Grid2, InputLabel, FormControl } from '@mui/material';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';
import ConceptualModel from '../components/ConceptualModel';

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const [variablesDict, setVariablesDict] = useState({});
    const [selectedVariables, setSelectedVariables] = useState([]);
    const [bivariateVarName1, setBivariateVarName1] = useState('');
    const [bivariateVarName2, setBivariateVarName2] = useState('');
    const [biVariableDict, setBiVariableDict] = useState({});

    // useEffect(() => {
    //     let newVariableDict = {};
    //     Object.entries(variablesDict).forEach(([varName, variable]) => {
    //         let newBinEdges = d3.range(newBins + 1).map(i => variable.min + i * (variable.max - variable.min) / newBins);
    //         // TODO: how to deal with the change of bin number? how to split the counts?
    //     })
    // }, [newBins])

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

    const handleClickVar = (varName) => {
        if (selectedVariables.includes(varName)) {
            let updatedvariables = selectedVariables;
            updatedvariables = updatedvariables.filter(item => item !== varName)
            setSelectedVariables(updatedvariables);
        }
        else {
            setSelectedVariables(prev => ([...prev, varName]));
        }
    }

    const handleSelectBiVar1 = (event) => {
        setBivariateVarName1(event.target.value);
    }

    const handleSelectBiVar2 = (event) => {
        setBivariateVarName2(event.target.value);
    }

    return (
        <div className='workspace-div'>
            <ConceptualModel variablesDict={variablesDict} setVariablesDict={setVariablesDict} setBiVariableDict={setBiVariableDict} updateVariable={updateVariable} />

            <Grid2 sx={{ my: 2 }} container spacing={3}>
                <Grid2 className="module-div" size={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3>Bivariate Distribution</h3>
                        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: "center" }}>
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
                        </Box>

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
                        {Object.entries(variablesDict).map(([varName, curVar], i) => {
                            return (
                                <Box key={varName} sx={{ width: '100%', height: '100%' }}>
                                    <Button variant={selectedVariables.includes(varName) ? 'contained' : 'outlined'} onClick={() => handleClickVar(varName)}>{varName}</Button>
                                    {selectedVariables.includes(varName) ?
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
