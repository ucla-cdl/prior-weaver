import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid2, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { graphviz } from "d3-graphviz";
import { logUserBehavior } from '../utils/BehaviorListener';

export default function ConceptualModel({ variablesDict, setVariablesDict, setBiVariableDict, updateVariable }) {

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

    useEffect(() => {
        drawConceptualModel();
    }, [variablesDict]);

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

    const addNewVariable = () => {
        setIsAddingVariable(true);
    }

    const confirmAddVariable = () => {
        setVariable();
        logUserBehavior("conceptual-model", "click button", "add a variable", `${newVarName}`);
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
            binEdges: binEdges,
            counts: Array(newBins).fill(0),
            relations: {
                "causes": [],
                "associates": []
            }
        };

        // Add a bivariable relationship
        Object.entries(variablesDict).forEach(([varName, variable]) => {
            let biVarName = varName + "-" + newVarName;
            console.log("add bi-var relation:", biVarName);
            setBiVariableDict(prev => ({
                ...prev,
                [biVarName]: {
                    name: biVarName,
                    predictionDots: [],
                    populateDots: [],
                    chipDots: []
                }
            }))
        })

        setVariablesDict(prev => ({ ...prev, [newVariable.name]: newVariable }));
    };

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
        logUserBehavior("conceptual-model", "click button", "add a relation", `${relatedVar1}-${relation}-${relatedVar2}`);
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
        <Grid2 container spacing={1}>
            <Grid2 size={5}>
                <Box className="module-div" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: "space-around" }}>
                        <h3>Conceptual Model</h3>
                        <Button sx={{ m: 5 }} variant="outlined" onClick={addNewVariable}>Add Variable</Button>
                        <Dialog open={isAddingVariable}>
                            <DialogTitle>Adding a New Variable</DialogTitle>
                            <DialogContent>
                                <TextField
                                    sx={{ m: '10px' }}
                                    label="Variable Name"
                                    value={newVarName}
                                    onChange={(e) => setNewVarName(e.target.value)}
                                />
                                <Box>
                                    <TextField
                                        sx={{ m: '10px' }}
                                        label="Min Value"
                                        type="number"
                                        value={newMin}
                                        onChange={(e) => setNewMin(parseFloat(e.target.value))}
                                    />
                                    <TextField
                                        sx={{ m: '10px' }}
                                        label="Max Value"
                                        type="number"
                                        value={newMax}
                                        onChange={(e) => setNewMax(parseFloat(e.target.value))}
                                    />
                                </Box>
                            </DialogContent>
                            <DialogActions>
                                <Button color='danger' onClick={handleCloseAddVariableDialog}>Cancel</Button>
                                <Button variant="contained" onClick={confirmAddVariable}>Confirm</Button>
                            </DialogActions>
                        </Dialog>

                        <Button variant="outlined" onClick={addNewRelation}>Add Relation</Button>
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
                                                    <MenuItem disabled={varName === relatedVar2?.name} key={varName} value={curVar}>{varName}</MenuItem>
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
                                                    <MenuItem disabled={varName === relatedVar1?.name} key={varName} value={curVar}>{varName}</MenuItem>
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
                        {/* # of Bin */}
                        {/* <Stack spacing={1} direction="row" sx={{ alignItems: 'center' }}>
                            <Typography sx={{ fontWeight: 'bold' }}># of Bin:</Typography>
                            <Slider
                                sx={{ width: "200px" }}
                                value={newBins}
                                onChange={(e, val) => setNewBins(val)}
                                aria-labelledby="bins-slider"
                                valueLabelDisplay="auto"
                                step={1}
                                marks
                                min={2}
                                max={20}
                            />
                        </Stack> */}
                    </Box>

                    <div id='conceptual-model-div'></div>
                </Box>
            </Grid2>

            <Grid2 size={7}>
            </Grid2>
        </Grid2>
    )
}