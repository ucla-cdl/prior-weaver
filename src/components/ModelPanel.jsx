import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2, IconButton, TextField, Typography } from '@mui/material';
import React, { useContext, useState } from 'react';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { VariableContext } from '../contexts/VariableContext';
import { TASK_SETTINGS, ELICITATION_SPACE, WorkspaceContext } from '../contexts/WorkspaceContext';
import { Edit } from '@mui/icons-material';

export default function ModelPanel() {
    const { taskId, model, space, tutorial } = useContext(WorkspaceContext)
    const { variablesDict, updateVariable, parametersDict, updateParameter, biVariable1, setBiVariable1, biVariable2, setBiVariable2, addToBiVarPlot } = useContext(VariableContext);

    const [isEditingVariable, setIsEditingVariable] = useState(false);
    const [editingVariable, setEditingVariable] = useState(null);

    const [isEditingParameter, setIsEditingParameter] = useState(false);
    const [editingParameter, setEditingParameter] = useState(null);

    const confirmEditvariable = () => {
        let updatedVaribale = { ...editingVariable };
        updateVariable(updatedVaribale.name, updatedVaribale);
        setIsEditingVariable(false);
    }

    const confirmEditParameter = () => {
        let updatedParameter = { ...editingParameter };
        updateParameter(updatedParameter.name, updatedParameter);
        setIsEditingParameter(false);
    }

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            {/* Scenario info */}
            {/* <Box className="context-container">
                <Typography variant="h6" gutterBottom>Scenario</Typography>
                <Typography variant='body1' sx={{ maxHeight: '150px', overflowY: 'auto' }}>{TASK_SETTINGS[taskId]?.scenario}</Typography>
            </Box> */}

            {/* Model info */}
            <Box className="context-container">
                <Typography variant="h6" gutterBottom>Model</Typography>
                <Typography>{model}</Typography>
            </Box>

            {/* Variable List */}
            <Box className="context-container">
                <Typography variant="h6" gutterBottom>Variables</Typography>
                {Object.entries(variablesDict).map(([varName, variable]) => (
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} key={varName}>
                        <Typography variant="body1"><b>{varName}</b> ({variable.unitLabel})</Typography>
                        <IconButton onClick={() => {
                            setEditingVariable(variable);
                            setIsEditingVariable(true);
                        }}>
                            <Edit fontSize='small' />
                        </IconButton>
                        {space === ELICITATION_SPACE.PARAMETER ?
                            <></>
                            : biVariable1?.name === variable.name ? (
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
                                disabled
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
            </Box>

            <Box className="context-container">
                <Typography variant='h6' gutterBottom>Parameters</Typography>
                {Object.entries(parametersDict).map(([paraName, parameter]) => (
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} key={paraName}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{paraName}</Typography>
                        {space === ELICITATION_SPACE.PARAMETER &&
                            <IconButton onClick={() => {
                                setEditingParameter(parameter);
                                setIsEditingParameter(true);
                            }}>
                                <Edit fontSize='small' />
                            </IconButton>
                        }
                    </Box>
                ))}

                <Dialog open={isEditingParameter}>
                    <DialogTitle>Editing Parameter</DialogTitle>
                    <DialogContent>
                        <TextField
                            sx={{ m: '10px' }}
                            label="Parameter Name"
                            value={editingParameter?.name || ''}
                            disabled
                        />
                        <Box>
                            <TextField
                                sx={{ m: '10px' }}
                                label="Min Value"
                                type="number"
                                value={editingParameter?.min || 0}
                                onChange={(e) => setEditingParameter({ ...editingParameter, min: parseFloat(e.target.value) })}
                            />
                            <TextField
                                sx={{ m: '10px' }}
                                label="Max Value"
                                type="number"
                                value={editingParameter?.max || 100}
                                onChange={(e) => setEditingParameter({ ...editingParameter, max: parseFloat(e.target.value) })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button color='danger' onClick={() => setIsEditingParameter(false)}>Cancel</Button>
                        <Button variant="contained" onClick={confirmEditParameter}>Confirm</Button>
                    </DialogActions>
                </Dialog>
            </Box>

        </Box>
    )
}