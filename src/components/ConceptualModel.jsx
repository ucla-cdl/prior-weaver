import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2, IconButton, TextField, Typography } from '@mui/material';
import React, { useContext, useState } from 'react';
import BrushIcon from '@mui/icons-material/Brush';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { VariableContext } from '../contexts/VariableContext';

export default function ConceptualModel() {
    const { variablesDict, updateVariable, biVariable1, setBiVariable1, biVariable2, setBiVariable2, addToBiVarPlot } = useContext(VariableContext);

    const [isEditingVariable, setIsEditingVariable] = useState(false);
    const [editingVariable, setEditingVariable] = useState(null);

    const confirmEditvariable = () => {
        let updatedVaribale = { ...editingVariable };
        updateVariable(updatedVaribale.name, updatedVaribale);
        setIsEditingVariable(false);
    }

    return (
        <Grid2 container spacing={3}>
            {/* Variable List */}
            <Grid2 size={12} className="module-div">
                <Typography variant="h6" gutterBottom>Variables</Typography>
                {Object.entries(variablesDict).map(([varName, variable]) => (
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} key={varName}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{varName}</Typography>
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

                <Dialog open={isEditingVariable}>
                    <DialogTitle>Editing Variable</DialogTitle>
                    <DialogContent>
                        <TextField
                            sx={{ m: '10px' }}
                            label="Variable Name"
                            value={editingVariable?.name || ''}
                            disabled
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
        </Grid2>
    )
}