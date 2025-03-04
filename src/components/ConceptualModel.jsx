import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid2, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { graphviz } from "d3-graphviz";
import { logUserBehavior } from '../utils/BehaviorListener';
import DeleteIcon from '@mui/icons-material/Delete';
import BrushIcon from '@mui/icons-material/Brush';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';

const RELATIONS = {
    INFLUENCE: "influences",
    ASSOCIATE: "associates with",
    NONE: "not related to",
};

export default function ConceptualModel({ variablesDict, updateVariable, setVariablesDict, biVariable1, setBiVariable1, biVariable2, setBiVariable2, addToBiVarPlot, addAttributeToEntities }) {

    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [newVarName, setNewVarName] = useState('');
    const [newMin, setNewMin] = useState(0);
    const [newMax, setNewMax] = useState(100);
    const [newUnitLabel, setNewUnitLabel] = useState('');
    const [newBins, setNewBins] = useState(10);

    const [isEditingVariable, setIsEditingVariable] = useState(false);
    const [editingVariable, setEditingVariable] = useState(null);

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
            sequenceNum: Object.keys(variablesDict).length
        };

        // Add an attribute to every existing entities
        addAttributeToEntities(newVarName);

        updateVariable(newVariable.name, newVariable)
        // setVariablesDict(prev => ({ ...prev, [newVariable.name]: newVariable }));
    };

    const confirmEditvariable = () => {
        let updatedVaribale = { ...editingVariable };
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
            <Grid2 size={12} className="module-div">
                <Typography variant="h6" gutterBottom>Variables</Typography>
                {Object.entries(variablesDict).map(([varName, variable]) => (
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} key={varName}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{varName}</Typography>
                        {/* <IconButton onClick={() => deleteVar(varName)}>
                            <DeleteIcon fontSize='small' />
                        </IconButton> */}
                        <IconButton onClick={() => {
                            setEditingVariable(variable);
                            setIsEditingVariable(true);
                        }}>
                            <BrushIcon fontSize='small' />
                        </IconButton>
                        {biVariable1?.name === variable.name ? (
                            <IconButton
                                onClick={() => setBiVariable1(null)}>
                                <RemoveCircleIcon fontSize='small' />
                            </IconButton>
                        ) : biVariable2?.name === variable.name ? (
                            <IconButton
                                onClick={() => setBiVariable2(null)}>
                                <RemoveCircleIcon fontSize='small' />
                            </IconButton>
                        ) : (
                            <IconButton
                                disabled={biVariable1 !== null && biVariable2 !== null}
                                onClick={() => addToBiVarPlot(variable)}>
                                <AddCircleIcon fontSize='small' />
                            </IconButton>
                        )}
                    </Box>
                ))}
                {/* <Button sx={{ m: 2 }} variant="outlined" onClick={addNewVariable}>Add Variable</Button> */}

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
            {/* <Grid2 size={7} className="module-div">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3>Conceptual Model</h3>
                    <div id='conceptual-model-div'></div>
                </Box>
            </Grid2> */}
        </Grid2>
    )
}