import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid2, IconButton, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { graphviz } from "d3-graphviz";
import { logUserBehavior } from '../utils/BehaviorListener';
import DeleteIcon from '@mui/icons-material/Delete';
import BrushIcon from '@mui/icons-material/Brush';

const RELATIONS = {
    INFLUENCE: "influences", 
    ASSOCIATE: "associates with", 
    NONE: "not related to",
};

export default function ConceptualModel({ variablesDict, updateVariable, setVariablesDict, biVariableDict, updateBivariable, selectBivariable, addAttributeToEntities }) {

    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [newVarName, setNewVarName] = useState('');
    const [newMin, setNewMin] = useState(0);
    const [newMax, setNewMax] = useState(100);
    const [newUnitLabel, setNewUnitLabel] = useState('');
    const [newBins, setNewBins] = useState(10);

    const [isEditingVariable, setIsEditingVariable] = useState(false);
    const [editingVariable, setEditingVariable] = useState(null);

    useEffect(() => {
        drawConceptualModel();
    }, [variablesDict, biVariableDict]);

    const drawConceptualModel = () => {
        document.getElementById("conceptual-model-div").innerHTML = "";

        let conceptualModel = "digraph {\n";

        // Add Univariate Variables
        Object.entries(variablesDict).forEach(([varName, variable]) => {
            conceptualModel += `${varName};\n`;
        });

        // Add Bivariate Relationships
        Object.entries(biVariableDict).forEach(([biVarName, biVariable]) => {
            const [var1, var2] = biVarName.split("-");
            switch (biVariable.relation) {
                case RELATIONS.INFLUENCE:
                    conceptualModel += `${var1} -> ${var2} [label="influences"];\n`;
                    break;
                case RELATIONS.ASSOCIATE:
                    conceptualModel += `${var1} -> ${var2} [dir="both" label="assoc."];\n`;
                default:
                    break;
            }
        });

        conceptualModel += "}";
        console.log("draw conceptual model", conceptualModel);
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
            updateBivariable(biVarName, {
                name: biVarName,
                relation: RELATIONS.NONE,
                specified: false,
                predictionDots: [],
                populateDots: [],
                chipDots: [],
                fittedRelation: {},
            })
        })

        // Add an attribute to every existing entities
        addAttributeToEntities(newVarName);

        updateVariable(newVariable.name, newVariable)
        // setVariablesDict(prev => ({ ...prev, [newVariable.name]: newVariable }));
    };

    const confirmEditvariable = () => {
        let updatedVaribale = { ...editingVariable };
        let updatedMin = updatedVaribale.min;
        let updatedMax = updatedVaribale.max;
        updatedVaribale.binEdges = d3.range(newBins + 1).map(i => updatedMin + i * (updatedMax - updatedMin) / newBins)
        updateVariable(updatedVaribale.name, updatedVaribale);
        setIsEditingVariable(false);
    }

    const deleteVar = (name) => {
        let newVariablesDict = { ...variablesDict };
        delete newVariablesDict[name];
        setVariablesDict(newVariablesDict);
        logUserBehavior("conceptual-model", "click button", "delete a variable", `${name}`);
    }

    return (
        <Grid2 container spacing={3}>
            {/* Variable List */}
            <Grid2 size={5} className="module-div">
                <h3>Variables</h3>
                {Object.entries(variablesDict).map(([varName, variable]) => (
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }} key={varName}>
                        <p><strong>
                            {varName}
                        </strong></p>
                        <IconButton onClick={() => deleteVar(varName)}>
                            <DeleteIcon fontSize='small' />
                        </IconButton>
                        <IconButton onClick={() => {
                            setEditingVariable(variable);
                            setIsEditingVariable(true);
                        }}>
                            <BrushIcon fontSize='small' />
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

                <Dialog open={isEditingVariable}>
                    <DialogTitle>Editing Variable</DialogTitle>
                    <DialogContent>
                        <TextField
                            sx={{ m: '10px' }}
                            label="Variable Name"
                            value={editingVariable?.name || ''}
                            disabled
                        // onChange={(e) => setEditingVariable({ ...editingVariable, name: e.target.value })}
                        />
                        <Box>
                            <TextField
                                sx={{ m: '10px' }}
                                label="Unit Label"
                                value={editingVariable?.unitLabel || ''}
                                onChange={(e) => setEditingVariable({ ...editingVariable, unitLabel: e.target.value })}
                            />
                        </Box>
                        <Box>
                            <TextField
                                sx={{ m: '10px' }}
                                label="Min Value"
                                type="number"
                                value={editingVariable?.min || 0}
                                onChange={(e) => setEditingVariable({ ...editingVariable, min: parseFloat(e.target.value) })}
                            />
                            <TextField
                                sx={{ m: '10px' }}
                                label="Max Value"
                                type="number"
                                value={editingVariable?.max || 100}
                                onChange={(e) => setEditingVariable({ ...editingVariable, max: parseFloat(e.target.value) })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button color='danger' onClick={() => setIsEditingVariable(false)}>Cancel</Button>
                        <Button variant="contained" onClick={confirmEditvariable}>Confirm</Button>
                    </DialogActions>
                </Dialog>
            </Grid2>
            <Grid2 size={7} className="module-div">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3>Conceptual Model</h3>
                    <div id='conceptual-model-div'></div>
                </Box>
            </Grid2>
        </Grid2>
    )
}