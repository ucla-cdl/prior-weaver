import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2, IconButton, TextField, Typography } from '@mui/material';
import React, { useContext, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { VariableContext } from '../contexts/VariableContext';
import { TASK_SETTINGS, ELICITATION_SPACE, WorkspaceContext } from '../contexts/WorkspaceContext';
import { Edit } from '@mui/icons-material';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export default function ModelPanel() {
    const { taskId, model, space, tutorial } = useContext(WorkspaceContext)
    const { variablesDict, updateVariable, parametersDict, updateParameter } = useContext(VariableContext);

    const [isEditingVariable, setIsEditingVariable] = useState(false);
    const [editingVariable, setEditingVariable] = useState(null);

    const [isEditingParameter, setIsEditingParameter] = useState(false);
    const [editingParameter, setEditingParameter] = useState(null);

    const confirmEditvariable = () => {
        let updatedVaribale = { ...editingVariable };
        if (updatedVaribale.min === '' || updatedVaribale.max === '') {
            alert('Min and max values are required');
            return;
        }

        updatedVaribale.min = parseFloat(updatedVaribale.min);
        updatedVaribale.max = parseFloat(updatedVaribale.max);

        if (updatedVaribale.max <= updatedVaribale.min) {
            alert('Max value must be greater than min value');
            return;
        }

        updateVariable(updatedVaribale.name, updatedVaribale);
        setIsEditingVariable(false);
    }

    const confirmEditParameter = () => {
        let updatedParameter = { ...editingParameter };
        if (updatedParameter.min === '' || updatedParameter.max === '') {
            alert('Min and max values are required');
            return;
        }
        updatedParameter.min = parseFloat(updatedParameter.min);
        updatedParameter.max = parseFloat(updatedParameter.max);

        if (updatedParameter.max <= updatedParameter.min) {
            alert('Max value must be greater than min value');
            return;
        }

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
                <p style={{ fontSize: '0.8rem' }}><InlineMath math={model} /></p>
            </Box>

            {/* Variable List */}
            <Box className="context-container">
                <Typography variant="h6" gutterBottom>Variables</Typography>
                {Object.entries(variablesDict).map(([varName, variable]) => (
                    <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }} key={varName}>
                        <Typography variant="body1"><b>{varName} {space === ELICITATION_SPACE.PARAMETER ? `(${variable.unitLabel})` : ''}</b></Typography>
                        <IconButton onClick={() => {
                            setEditingVariable({ ...variable });
                            setIsEditingVariable(true);
                        }}>
                            <Edit fontSize='small' />
                        </IconButton>
                    </Box>
                ))}

                <Dialog open={isEditingVariable}>
                    <DialogTitle>Editing Variable</DialogTitle>
                    <DialogContent>
                        <Box>
                            <TextField
                                sx={{ m: '10px' }}
                                label="Variable Name"
                                value={editingVariable?.name || ''}
                                disabled
                            />
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
                                value={editingVariable?.min !== null ? editingVariable?.min : ''}
                                onChange={(e) => setEditingVariable({ ...editingVariable, min: e.target.value })}
                            />
                            <TextField
                                sx={{ m: '10px' }}
                                label="Max Value"
                                value={editingVariable?.max !== null ? editingVariable?.max : ''}
                                onChange={(e) => setEditingVariable({ ...editingVariable, max: e.target.value })}
                            />
                        </Box>
                        {space === ELICITATION_SPACE.OBSERVABLE && <Box>
                            <TextField
                                sx={{ m: '10px' }}
                                label="Bin Count"
                                type="number"
                                value={editingVariable?.binCount || 10}
                                onChange={(e) => setEditingVariable({ ...editingVariable, binCount: parseInt(e.target.value) })}
                                inputProps={{ min: 2 }}
                            />
                        </Box>}
                    </DialogContent>
                    <DialogActions>
                        <Button color='danger' onClick={() => setIsEditingVariable(false)}>Cancel</Button>
                        <Button variant="contained" onClick={confirmEditvariable}>Confirm</Button>
                    </DialogActions>
                </Dialog>
            </Box>

            <Box className="context-container">
                <Typography variant='h6'>Parameters</Typography>
                <Typography variant='body2'>(also known as Coefficients)</Typography>
                {Object.entries(parametersDict).map(([paraName, parameter]) => (
                    <Box sx={{ my: 1, display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }} key={paraName}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}><InlineMath math={`\\alpha_{${paraName}}`} /></Typography>
                        {space === ELICITATION_SPACE.PARAMETER &&
                            <IconButton onClick={() => {
                                setEditingParameter({ ...parameter });
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
                                inputProps={{ min: -Infinity }}
                                value={editingParameter?.min !== null ? editingParameter?.min : ''}
                                onChange={(e) => setEditingParameter({ ...editingParameter, min: e.target.value })}
                            />
                            <TextField
                                sx={{ m: '10px' }}
                                label="Max Value"
                                type="number"
                                inputProps={{ min: -Infinity }}
                                value={editingParameter?.max !== null ? editingParameter?.max : ''}
                                onChange={(e) => setEditingParameter({ ...editingParameter, max: e.target.value })}
                            />
                        </Box>
                        {space === ELICITATION_SPACE.PARAMETER &&
                            <Box>
                                <TextField
                                    sx={{ m: '10px' }}
                                    label="Bin Count"
                                    type="number"
                                    value={editingParameter?.binCount || 10}
                                    onChange={(e) => setEditingParameter({ ...editingParameter, binCount: parseInt(e.target.value) })}
                                    inputProps={{ min: 2 }}
                                />
                            </Box>
                        }
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