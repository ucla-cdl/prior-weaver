import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid2, IconButton, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { graphviz } from "d3-graphviz";
import { logUserBehavior } from '../utils/BehaviorListener';
import DeleteIcon from '@mui/icons-material/Delete';
import BrushIcon from '@mui/icons-material/Brush';

export default function ConceptualModel({ variablesDict, setVariablesDict, biVariableDict, setBiVariableDict, updateVariable, updateBivariable, selectBivariable }) {

    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [newVarName, setNewVarName] = useState('');
    const [newMin, setNewMin] = useState(0);
    const [newMax, setNewMax] = useState(100);
    const [newUnitLabel, setNewUnitLabel] = useState('');
    const [newBins, setNewBins] = useState(10);

    const [isAddingRelation, setIsAddingRelation] = useState(false);
    const [relatedVar1, setRelatedVar1] = useState('');
    const [relatedVar2, setRelatedVar2] = useState('');
    const RELATIONS = ["causes", "associates with", "not related to"];
    const [relation, setRelation] = useState('');

    useEffect(() => {
        drawConceptualModel();
    }, [variablesDict, biVariableDict]);

    const drawConceptualModel = () => {
        document.getElementById("conceptual-model-div").innerHTML = "";

        let conceptualModel = "digraph {\n";
        Object.entries(variablesDict).forEach(([varName, variable]) => {
            conceptualModel += `${varName};\n`
            // Object.entries(variable.relations).forEach(([relation, relatedVars]) => {
            //     for (let index = 0; index < relatedVars.length; index++) {
            //         const relatedVar = relatedVars[index];
            //         switch (relation) {
            //             case "causes":
            //                 conceptualModel += `${varName} -> ${relatedVar} [label="causes"];\n`;
            //                 break;

            //             case "associates_with":
            //                 conceptualModel += `${varName} -> ${relatedVar} [dir="both" label="assoc."];\n`;
            //                 break;

            //             default:
            //                 break;
            //         }
            //     }
            // })
        });

        Object.entries(biVariableDict).forEach(([biVarName, biVariable]) => {
            const [var1, var2] = biVarName.split("-");
            switch (biVariable.relation) {
                case "causes":
                    conceptualModel += `${var1} -> ${var2} [label="causes"];\n`;
                    break;
                case "associates with":
                    conceptualModel += `${var1} -> ${var2} [dir="both" label="assoc."];\n`;
                default:
                    break;
            }
        });

        conceptualModel += "}";
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
        setNewUnitLabel('');
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
            unitLabel: newUnitLabel,
            binEdges: binEdges,
            counts: Array(newBins).fill(0),
            distributions: [],
            sequenceNum: Object.keys(variablesDict).length
        };

        // Add a bivariable relationship
        Object.entries(variablesDict).forEach(([varName, variable]) => {
            let biVarName = varName + "-" + newVarName;
            console.log("add bi-var relation:", biVarName);
            setBiVariableDict(prev => ({
                ...prev,
                [biVarName]: {
                    name: biVarName,
                    relation: "not related to",
                    specified: false,
                    predictionDots: [],
                    populateDots: [],
                    chipDots: [],
                    fittedRelation: {},
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
        updateBivariable(relatedVar1.name + "-" + relatedVar2.name, "relation", relation);
        logUserBehavior("conceptual-model", "click button", "add a relation", `${relatedVar1.name}-${relation}-${relatedVar2.name}`);
        handleCloseAddRelationDialog();
    }

    const handleCloseAddRelationDialog = () => {
        setRelatedVar1('');
        setRelatedVar2('');
        setRelation('');
        setIsAddingRelation(false);
    }

    const deleteVar = (name) => {
        let newVariablesDict = { ...variablesDict };
        delete newVariablesDict[name];
        setVariablesDict(newVariablesDict);
        logUserBehavior("conceptual-model", "click button", "delete a variable", `${name}`);
    }

    const modifyRelation = (variable, relatedVarName, formerRelation, targetRelation) => {
        let newRelations = { ...variable.relations };
        newRelations[formerRelation] = newRelations[formerRelation].filter(varName => varName !== relatedVarName)
        newRelations[targetRelation].push(relatedVarName);
        logUserBehavior("conceptual-model", "select", "modify a relation", `${variable.name}-${relatedVarName}: ${formerRelation} -> ${targetRelation}`);
        updateVariable(variable.name, "relations", newRelations);
    }

    return (
        <Grid2 container spacing={3}>
            {/* Variable List */}
            <Grid2 size={3} className="module-div">
                <h3>Variables</h3>
                {Object.entries(variablesDict).map(([varName, variable]) => (
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }} key={varName}>
                        <p><strong>
                            {varName}
                        </strong></p>
                        <IconButton onClick={() => deleteVar(varName)}>
                            <DeleteIcon fontSize='small' />
                        </IconButton>
                    </Box>
                ))}
                <Button sx={{ m: 2 }} variant="outlined" onClick={addNewVariable}>Add Variable</Button>
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
                                label="Unit Label"
                                value={newUnitLabel}
                                onChange={(e) => setNewUnitLabel(e.target.value)}
                            />
                        </Box>
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
            </Grid2>

            {/* Conceptual Model */}
            <Grid2 size={5} className="module-div">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3>Conceptual Model</h3>
                    <div id='conceptual-model-div'></div>
                </Box>
            </Grid2>

            {/* Relation List */}
            <Grid2 size={4} className="module-div">
                <h3>Relationships</h3>
                {Object.entries(biVariableDict).map(([biVarName, biVariable]) => {
                    let [varName, relatedVarName] = biVarName.split("-");
                    return (
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                flexDirection: 'row', 
                                justifyContent: 'center', 
                                color: biVariable.specified ? 'green' : 'grey' 
                            }} 
                            key={biVarName}
                        >
                            <p><strong>
                                {varName}&nbsp;&nbsp;&nbsp;
                            </strong></p>
                            <p><u>
                                {biVariable.relation}
                            </u></p>
                            <p><strong>
                                &nbsp;&nbsp;&nbsp;{relatedVarName}
                            </strong></p>
                            <IconButton sx={{mx: 1}} onClick={() => selectBivariable(biVarName)}>
                                <BrushIcon fontSize='small' />
                            </IconButton>
                        </Box>
                    );
                })}
                <Button sx={{ m: 2 }} variant="outlined" onClick={addNewRelation}>Add Relation</Button>
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
            </Grid2>
        </Grid2>
    )
}