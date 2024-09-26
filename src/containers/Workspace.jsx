import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { graphviz } from "d3-graphviz";
import "./Workspace.css";
import { Button, TextField, Slider, Typography, Box, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, Grid2, InputLabel, FormControl } from '@mui/material';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const [variablesDict, setVariablesDict] = useState({});
    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [newVarName, setNewVarName] = useState('');
    const [newMin, setNewMin] = useState(0);
    const [newMax, setNewMax] = useState(100);
    const [newBins, setNewBins] = useState(10);

    const [isAddingRelation, setIsAddingRelation] = useState(false);
    const [relatedVar1, setRelatedVar1] = useState('');
    const [relatedVar2, setRelatedVar2] = useState('');
    const RELATIONS = ["causes", "associates"]
    const [relation, setRelation] = useState('');

    const [selectedVariables, setSelectedVariables] = useState([]);

    const [bivariateVar1, setBivariateVar1] = useState('');
    const [bivariateVar2, setBivariateVar2] = useState('');
    const [biVariableDict, setBiVariableDict] = useState({});

    const addNewVariable = () => {
        setIsAddingVariable(true);
    }

    const confirmAddVariable = () => {
        setVariable();
        handleCloseAddVariableDialog();
    }

    const handleCloseAddVariableDialog = () => {
        setNewVarName('');
        setNewMin(0);
        setNewMax(100);
        setNewBins(10);
        setIsAddingVariable(false);
    }

    const setVariable = () => {
        const binEdges = d3.range(newBins + 1).map(i => newMin + i * (newMax - newMin) / newBins);
        let newVariable = {
            name: newVarName,
            min: newMin,
            max: newMax,
            numBins: newBins,
            binEdges: binEdges,
            counts: Array(newBins).fill(0),
            relations: {
                "causes": [],
                "associates": []
            }
        };

        setVariablesDict(prev => ({ ...prev, [newVariable.name]: newVariable }));
    };

    const updateVariable = (name, key, value) => {
        setVariablesDict(prev => ({
            ...prev,
            [name]: { ...prev[name], [key]: value }
        }));
    }

    useEffect(() => {
        if (bivariateVar1 && bivariateVar2) {
            console.log("update bivars");
            setBivariateVar1(variablesDict[bivariateVar1.name]);
            setBivariateVar2(variablesDict[bivariateVar2.name]);
        }
    }, [variablesDict]);

    const updateBivariable = (name, key, value) => {

    }

    useEffect(() => {
        drawConceptualModel();
    }, [variablesDict]);

    const handleClickVar = (varName) => {
        if (selectedVariables.includes(varName)) {
            let updatedvariables = selectedVariables;
            updatedvariables = updatedvariables.splice(updatedvariables.indexOf(varName), 1)
            setSelectedVariables(updatedvariables);
        }
        else {
            setSelectedVariables(prev => ([...prev, varName]));
        }
    }

    const drawConceptualModel = () => {
        document.getElementById("conceptual-model-div").innerHTML = "";

        let conceptualModel = "digraph {\n";
        Object.entries(variablesDict).forEach(([varName, variable]) => {
            conceptualModel += `${varName};\n`
            Object.entries(variable.relations).forEach(([relation, relatedVars]) => {
                for (let index = 0; index < relatedVars.length; index++) {
                    const relatedVar = relatedVars[index];
                    switch (relation) {
                        case "causes":
                            conceptualModel += `${varName} -> ${relatedVar} [label="causes"];\n`;
                            break;

                        case "associates":
                            conceptualModel += `${varName} -> ${relatedVar} [label="assoc."];\n`;
                            break;

                        default:
                            break;
                    }
                }
            })
        });

        conceptualModel += "}";
        console.log(conceptualModel)

        d3.select("#conceptual-model-div")
            .graphviz()
            .renderDot(conceptualModel);
    }

    const handleSelectBiVar1 = (event) => {
        setBivariateVar1(variablesDict[event.target.value]);
    }

    const handleSelectBiVar2 = (event) => {
        setBivariateVar2(variablesDict[event.target.value]);
    }

    const addNewRelation = () => {
        setIsAddingRelation(true);
    }

    const handleSelectRelatedVar1 = (event) => {
        setRelatedVar1(event.target.value);
    }

    const handleSelectRelatedVar2 = (event) => {
        setRelatedVar2(event.target.value);
    }

    const handleSelectRelation = (event) => {
        setRelation(event.target.value);
    }

    const confirmAddRelation = () => {
        let newRelations = { ...relatedVar1.relations };
        newRelations[relation].push(relatedVar2.name);
        console.log("new relation", newRelations);
        updateVariable(relatedVar1.name, "relations", newRelations);
        handleCloseAddRelationDialog();
    }

    const handleCloseAddRelationDialog = () => {
        setRelatedVar1('');
        setRelatedVar2('');
        setRelation('');
        setIsAddingRelation(false);
    }


    return (
        <div className='workspace-div'>
            <Button onClick={addNewVariable}>Add Variable</Button>
            <Dialog open={isAddingVariable} sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                <DialogTitle>Adding a New Variable</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Variable Name"
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                    />
                    <TextField
                        label="Min Value"
                        type="number"
                        value={newMin}
                        onChange={(e) => setNewMin(parseFloat(e.target.value))}
                    />
                    <TextField
                        label="Max Value"
                        type="number"
                        value={newMax}
                        onChange={(e) => setNewMax(parseFloat(e.target.value))}
                    />
                    <Typography gutterBottom>Number of Bins</Typography>
                    <Slider
                        value={newBins}
                        onChange={(e, val) => setNewBins(val)}
                        aria-labelledby="bins-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={5}
                        max={50}
                    />
                </DialogContent>
                <DialogActions>
                    <Button color='danger' onClick={handleCloseAddVariableDialog}>Cancel</Button>
                    <Button variant="contained" onClick={confirmAddVariable}>Confirm</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isAddingRelation}>
                <DialogTitle>Add a New Relation</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel id="var-1-label">Variable 1</InputLabel>
                            <Select
                                labelId='var-1-label'
                                value={relatedVar1}
                                label="Variable 1"
                                onChange={handleSelectRelatedVar1}
                            >
                                {Object.entries(variablesDict).map(([varName, curVar], i) => {
                                    return (
                                        <MenuItem disabled={varName == relatedVar2?.name} key={varName} value={curVar}>{varName}</MenuItem>
                                    )
                                })}
                            </Select>
                        </FormControl>
                        <FormControl sx={{ m: 1, minWidth: 120 }}>
                            <InputLabel id="relation-label">Relation</InputLabel>
                            <Select
                                labelId='relation-label'
                                value={relation}
                                label="Relation"
                                onChange={handleSelectRelation}
                            >
                                {RELATIONS.map((RELATION, i) => {
                                    return (
                                        <MenuItem key={i} value={RELATION}>{RELATION}</MenuItem>
                                    )
                                })}
                            </Select>
                        </FormControl>
                        <FormControl sx={{ m: 1, minWidth: 120 }}>
                            <InputLabel id="var-2-label">Variable 2</InputLabel>
                            <Select
                                labelId='var-2-label'
                                value={relatedVar2}
                                label="Variable 2"
                                onChange={handleSelectRelatedVar2}
                            >
                                {Object.entries(variablesDict).map(([varName, curVar], i) => {
                                    return (
                                        <MenuItem disabled={varName == relatedVar1?.name} key={varName} value={curVar}>{varName}</MenuItem>
                                    )
                                })}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button color='danger' onClick={handleCloseAddRelationDialog}>Cancel</Button>
                    <Button variant="contained" onClick={confirmAddRelation}>Confirm</Button>
                </DialogActions>
            </Dialog>

            <Grid2 container spacing={2}>
                <Grid2 size={6}>
                    <div id='conceptual-model-div'></div>
                </Grid2>

                <Grid2 size={6}>
                    <Button onClick={addNewRelation}>Add a Relation</Button>
                </Grid2>
            </Grid2>

            <Grid2 container spacing={2}>

                <Grid2 size={7}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel id="var-1-label">Variable 1</InputLabel>
                            <Select
                                labelId='var-1-label'
                                value={bivariateVar1 ? bivariateVar1.name : ''}
                                label="Variable 1"
                                onChange={handleSelectBiVar1}
                            >
                                {Object.entries(variablesDict).map(([varName, curVar], i) => {
                                    return (
                                        <MenuItem disabled={varName == bivariateVar2?.name} key={i} value={varName}>{varName}</MenuItem>
                                    )
                                })}
                            </Select>
                        </FormControl>
                        <FormControl sx={{ m: 1, minWidth: 120 }}>
                            <InputLabel id="var-2-label">Variable 2</InputLabel>
                            <Select
                                labelId='var-2-label'
                                value={bivariateVar2 ? bivariateVar2.name : ''}
                                label="Variable 2"
                                onChange={handleSelectBiVar2}
                            >
                                {Object.entries(variablesDict).map(([varName, curVar], i) => {
                                    return (
                                        <MenuItem disabled={varName == bivariateVar1?.name} key={i} value={varName}>{varName}</MenuItem>
                                    )
                                })}
                            </Select>
                        </FormControl>
                    </Box>

                    {bivariateVar1 && bivariateVar2 ?
                        <BiVariablePlot biVariable1={bivariateVar1} biVariable2={bivariateVar2} updateVariable={updateVariable} updateBivariable={updateBivariable} />
                        :
                        <></>}
                </Grid2>

                <Grid2 size={5}>
                    {Object.entries(variablesDict).map(([varName, curVar], i) => {
                        return (
                            <div key={varName}>
                                <Button variant={selectedVariables.includes(varName) ? 'contained' : 'outlined'} onClick={() => handleClickVar(varName)}>{varName}</Button>
                                {selectedVariables.includes(varName) ?
                                    <VariablePlot variable={curVar} updateVariable={updateVariable} />
                                    :
                                    <></>
                                }
                            </div>
                        )
                    })}
                </Grid2>
            </Grid2>
        </div>
    );
};
