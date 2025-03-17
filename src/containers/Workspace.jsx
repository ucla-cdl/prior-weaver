import React, { useState, useRef, useEffect, useContext } from 'react';
import "./Workspace.css";

import { Box, Typography, Tooltip, Button, TextField, IconButton, Skeleton, Radio, FormControl, FormLabel, RadioGroup, FormControlLabel } from '@mui/material';
import ModelPanel from '../components/ModelPanel';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';
import ParallelSankeyPlot from '../components/ParallelSankeyPlot';
import ResultsPanel from '../components/ResultsPanel';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import UndoIcon from '@mui/icons-material/Undo';

import { ELICITATION_SPACE, FEEDBACK_MODE, TASK_SETTINGS, WorkspaceContext } from '../contexts/WorkspaceContext';
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';
import { ParameterPlot } from '../components/ParameterPlot';

export default function Workspace() {
    const { task, setTask, space, setSpace, feedback, setFeedback, model, setModel, finishParseModel, leftPanelOpen, setLeftPanelOpen, rightPanelOpen, setRightPanelOpen } = useContext(WorkspaceContext);
    const { handleParseModel, variablesDict, parametersDict, biVariable1, biVariable2 } = useContext(VariableContext);
    const { currentVersion, getUndoOperationDescription, undoEntityOperation, redoEntityOperation } = useContext(EntityContext);

    const [userName, setUserName] = useState("");
    const [selectedTaskId, setSelectedTaskId] = useState(task.id);

    useEffect(() => {
        console.log("Workspace mounted - Backend at ", window.BACKEND_ADDRESS);
    }, []);


    const handleSwitchTask = (taskId) => {
        setSelectedTaskId(taskId);
        setTask(TASK_SETTINGS[taskId]);
    }

    return (
        <div className='workspace-div'>
            {!finishParseModel ?
                (
                    // Stage 1: Setup
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        maxWidth: '75vw',
                        margin: '0 auto',
                        padding: '20px'
                    }}>
                        {/* Study Setting */}
                        <Box>
                            <TextField
                                id='user-name'
                                label="User Name"
                                onChange={(e) => setUserName(e.target.value)}
                            />
                        </Box>
                        <Box sx={{ my: 2, display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
                            {/* Elicitation Space */}
                            <FormControl
                                sx={{
                                    position: 'relative',
                                    border: '1px solid rgba(0, 0, 0, 0.23)',
                                    borderRadius: '2px',
                                    p: 2
                                }}
                            >
                                <FormLabel
                                    id="demo-row-radio-buttons-group-label"
                                >
                                    Elicitation Space
                                </FormLabel>
                                <RadioGroup
                                    row
                                    aria-labelledby="demo-row-radio-buttons-group-label"
                                    name="row-radio-buttons-group"
                                    value={space}
                                    onChange={(e) => setSpace(e.target.value)}
                                >
                                    {Object.values(ELICITATION_SPACE).map((space) => (
                                        <FormControlLabel key={space} value={space} control={<Radio />} label={space} />
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            {/* Feedback Mode */}
                            <FormControl
                                sx={{
                                    position: 'relative',
                                    border: '1px solid rgba(0, 0, 0, 0.23)',
                                    borderRadius: '2px',
                                    p: 2
                                }}>
                                <FormLabel id="demo-row-radio-buttons-group-label">Feedback Mode</FormLabel>
                                <RadioGroup
                                    row
                                    aria-labelledby="demo-row-radio-buttons-group-label"
                                    name="row-radio-buttons-group"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                >
                                    {Object.values(FEEDBACK_MODE).map((feedback) => (
                                        <FormControlLabel key={feedback} value={feedback} control={<Radio />} label={feedback} />
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            {/* Task */}
                            <FormControl
                                sx={{
                                    position: 'relative',
                                    border: '1px solid rgba(0, 0, 0, 0.23)',
                                    borderRadius: '2px',
                                    p: 2
                                }}>
                                <FormLabel id="demo-row-radio-buttons-group-label">Task</FormLabel>
                                <RadioGroup
                                    row
                                    aria-labelledby="demo-row-radio-buttons-group-label"
                                    name="row-radio-buttons-group"
                                    value={selectedTaskId}
                                    onChange={(e) => handleSwitchTask(e.target.value)}
                                >
                                    {Object.values(TASK_SETTINGS).map((t) => (
                                        <FormControlLabel key={t.id} value={t.id} control={<Radio />} label={t.name} />
                                    ))}
                                </RadioGroup>
                            </FormControl>
                        </Box>

                        {/* Scenario and Code Input */}
                        <Box>
                            <Typography variant="h4" gutterBottom>
                                Scenario
                            </Typography>
                            <Typography paragraph sx={{ mb: 4 }}>
                                {task?.scenario}
                            </Typography>
                            <Typography paragraph>
                                Please input your model in R code.
                            </Typography>
                            <TextField
                                id="stan-code"
                                label="R Code"
                                multiline
                                rows={3}
                                variant="outlined"
                                fullWidth
                                sx={{ my: 2 }}
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            />
                            <Button
                                disabled={!model}
                                onClick={handleParseModel}
                                variant="contained"
                                size="large"
                            >
                                Continue
                            </Button>
                        </Box>
                    </Box>
                )
                :
                (
                    <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', position: 'relative' }}>
                        {/* Left Panel */}
                        <Box
                            className="panel left-panel"
                            sx={{
                                display: leftPanelOpen ? 'block' : 'none',
                                position: 'relative'
                            }}
                        >
                            <ModelPanel />
                        </Box>

                        {/* Left Panel Toggle Button - shown when left panel is closed */}
                        {!leftPanelOpen && (
                            <IconButton
                                sx={{
                                    position: 'fixed',
                                    left: '0',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    backgroundColor: 'white',
                                    '&:hover': { backgroundColor: '#f0f0f0' },
                                    boxShadow: 2,
                                    zIndex: 1000,
                                    width: '24px',
                                    height: '48px',
                                    borderRadius: '0 4px 4px 0'
                                }}
                                onClick={() => setLeftPanelOpen(true)}
                            >
                                <ChevronRightIcon />
                            </IconButton>
                        )}

                        {/* Left Panel Toggle Button - shown when left panel is open */}
                        {leftPanelOpen && (
                            <IconButton
                                sx={{
                                    position: 'absolute',
                                    left: 'calc(20vw - 10px)', // Adjust based on your left panel width
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    backgroundColor: 'white',
                                    '&:hover': { backgroundColor: '#f0f0f0' },
                                    boxShadow: 2,
                                    zIndex: 1000,
                                    width: '24px',
                                    height: '48px',
                                    borderRadius: '0 4px 4px 0'
                                }}
                                onClick={() => setLeftPanelOpen(false)}
                            >
                                <ChevronLeftIcon />
                            </IconButton>
                        )}

                        {/* Center Panel */}
                        {space === ELICITATION_SPACE.OBSERVABLE &&
                            <Box className="panel center-panel" sx={{ flex: 1 }}>
                                {/* Add the undo button near the top of the center panel */}
                                {feedback === FEEDBACK_MODE.FEEDBACK && (
                                    <Box sx={{
                                        position: 'absolute',
                                        top: 'calc(39vh - 10px)',
                                        right: rightPanelOpen ? 'calc(25vw + 10px)' : '10px',
                                        zIndex: 1000
                                    }}>
                                        <Tooltip title={getUndoOperationDescription()}>
                                            <span>
                                                <IconButton
                                                    onClick={undoEntityOperation}
                                                    disabled={currentVersion <= 0}
                                                    size="small"
                                                    sx={{
                                                        border: '2px solid',
                                                        backgroundColor: 'white',
                                                        '&:hover': { backgroundColor: '#f0f0f0' },
                                                        boxShadow: 1,
                                                    }}
                                                >
                                                    <UndoIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                )}

                                {/* Univariate and Bivariate Plots */}
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
                                    <div className="component-container univariate-container">
                                        <Typography variant="h6" gutterBottom>Univariate Distributions</Typography>
                                        <Box sx={{
                                            boxSizing: 'border-box',
                                            height: 'calc(100% - 32px)',
                                            display: 'flex',
                                            overflowX: 'auto'
                                        }}>
                                            {Object.entries(variablesDict).sort((a, b) => a[1].sequenceNum - b[1].sequenceNum).map(([varName, curVar], i) => (
                                                <VariablePlot key={i} variable={curVar} />
                                            ))}
                                        </Box>
                                    </div>
                                    <div className="component-container bivariate-container">
                                        <Typography variant="h6" gutterBottom>Bivariate Relationship</Typography>
                                        <Box sx={{
                                            boxSizing: 'border-box',
                                            height: 'calc(100% - 32px)',
                                        }}>
                                            {biVariable1 && biVariable2 ?
                                                <BiVariablePlot />
                                                :
                                                <Skeleton variant="rectangular" sx={{ mx: 'auto', my: 2, width: '85%', height: '85%' }} />}
                                        </Box>
                                    </div>
                                </Box>

                                {/* Parallel Coordinates Plot */}
                                <Box className="component-container parallel-plot-container">
                                    <Typography variant="h6" gutterBottom>Parallel Coordinates Plot</Typography>
                                    <Box sx={{
                                        boxSizing: 'border-box',
                                        height: 'calc(100% - 32px)'
                                    }}>
                                        <ParallelSankeyPlot />
                                    </Box>
                                </Box>
                            </Box>
                        }

                        {space === ELICITATION_SPACE.PARAMETER &&
                            <Box className="panel center-panel">
                                <Box className="component-container">
                                    <Box sx={{
                                        boxSizing: 'border-box',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflowY: 'auto',
                                        width: '100%'
                                    }}>
                                        {Object.entries(parametersDict).map(([paraName, parameter]) => (
                                            <ParameterPlot key={paraName} parameter={parameter} />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        }

                        {/* Right Panel Toggle Button - shown when right panel is open */}
                        {rightPanelOpen && feedback === FEEDBACK_MODE.FEEDBACK && (
                            <IconButton
                                sx={{
                                    position: 'absolute',
                                    right: 'calc(25vw - 10px)', // Adjust based on your right panel width
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    backgroundColor: 'white',
                                    '&:hover': { backgroundColor: '#f0f0f0' },
                                    boxShadow: 2,
                                    zIndex: 1000,
                                    width: '24px',
                                    height: '48px',
                                    borderRadius: '4px 0 0 4px'
                                }}
                                onClick={() => setRightPanelOpen(false)}
                            >
                                <ChevronRightIcon />
                            </IconButton>
                        )}

                        {/* Right Panel Toggle Button - shown when right panel is closed */}
                        {!rightPanelOpen && feedback === FEEDBACK_MODE.FEEDBACK && (
                            <IconButton
                                sx={{
                                    position: 'fixed',
                                    right: '0',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    backgroundColor: 'white',
                                    '&:hover': { backgroundColor: '#f0f0f0' },
                                    boxShadow: 2,
                                    zIndex: 1000,
                                    width: '24px',
                                    height: '48px',
                                    borderRadius: '4px 0 0 4px'
                                }}
                                onClick={() => setRightPanelOpen(true)}
                            >
                                <ChevronLeftIcon />
                            </IconButton>
                        )}

                        {/* Right Panel */}
                        {feedback === FEEDBACK_MODE.FEEDBACK && (
                            <Box
                                className="panel right-panel"
                                sx={{
                                    display: rightPanelOpen ? 'block' : 'none',
                                    position: 'relative'
                                }}
                            >
                                <div className="component-container results-container">
                                    <Typography variant="h6" gutterBottom>Results Panel</Typography>
                                    <Box sx={{
                                        boxSizing: 'border-box',
                                        height: 'calc(100% - 32px)'
                                    }}>
                                        <ResultsPanel />
                                    </Box>
                                </div>
                            </Box>
                        )}
                    </Box>
                )}
        </div>
    );
};
