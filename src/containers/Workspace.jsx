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
import { ELICITATION_SPACE, FEEDBACK_MODE, TASK_SETTINGS, WorkspaceContext } from '../contexts/WorkspaceContext';
import { VariableContext } from '../contexts/VariableContext';
import { SelectionContext, FILTER_TYPES } from '../contexts/SelectionContext';
import { ParameterPlot } from '../components/ParameterPlot';
import NavBar from '../components/NavBar';
import Joyride, { CallBackProps, ACTIONS, EVENTS, STATUS, ORIGIN } from 'react-joyride';

export default function Workspace() {
    const { taskId, space, feedback, model, finishParseModel, leftPanelOpen, setLeftPanelOpen, rightPanelOpen, setRightPanelOpen, tutorial, tutorialSteps, runTutorial, setRunTutorial } = useContext(WorkspaceContext);
    const { handleParseModel, parseVariables, variablesDict, parametersDict, biVariable1, biVariable2 } = useContext(VariableContext);
    const { setActiveFilter } = useContext(SelectionContext);

    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        console.log("Workspace mounted - Backend at ", window.BACKEND_ADDRESS);
    }, []);

    const handleJoyrideCallback = (data) => {
        const { action, index, origin, status, type, step } = data;

        if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
            setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
            if (step.data.pause) {
                setActiveFilter(FILTER_TYPES.INCOMPLETE);
            }
        } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setStepIndex(0);
            setRunTutorial(false);
        }
    };

    return (
        <div className='workspace-div'>
            {!finishParseModel ?
                (
                    // Stage 1: Setup
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <Box className='panel setup-panel'>
                            {/* Scenario and Code Input */}
                            <Box sx={{ my: 2, p: 4, borderBottom: '1px solid #ddd' }}>
                                <Typography variant="h4" gutterBottom>
                                    Scenario
                                </Typography>
                                <Typography variant='h6'>
                                    {TASK_SETTINGS[taskId]?.scenario}
                                </Typography>
                            </Box>
                            <Box sx={{ my: 1, p: 4, borderBottom: '1px solid #ddd' }}>
                                <Typography variant="h4" gutterBottom>
                                    Model Settings
                                    {/* Please input your model in R code. */}
                                </Typography>
                                <Box sx={{ my: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                    {taskId && Object.entries(TASK_SETTINGS[taskId]?.variables)?.map(([type, variables]) => (
                                        <Box key={type} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Typography sx={{ my: 1 }} variant='h5'>
                                                {type === "response" ? "Target Variable" : "Predictor Variables"}
                                            </Typography>
                                            {variables.map((variable) => (
                                                <Typography key={variable.name} variant='body1'>
                                                    <b>{variable.name} ({variable.unit})</b>: {variable.description}
                                                </Typography>
                                            ))}
                                        </Box>
                                    ))}
                                    <Box sx={{ my: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                        <Typography variant='h5'>Model Code</Typography>
                                        <TextField
                                            id="stan-code"
                                            label="R Code"
                                            multiline
                                            rows={3}
                                            variant="outlined"
                                            fullWidth
                                            value={model}
                                        // onChange={(e) => setModel(e.target.value)}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                            <Button
                                sx={{ my: 2 }}
                                disabled={!model}
                                onClick={parseVariables}
                                variant="contained"
                                size="large"
                            >
                                Next
                            </Button>
                        </Box>
                    </Box>
                )
                :
                (
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
                        <Joyride
                            steps={tutorialSteps}
                            continuous={true}
                            run={tutorial && runTutorial}
                            stepIndex={stepIndex}
                            callback={handleJoyrideCallback}
                            hideCloseButton={true}
                            disableOverlayClose={true}
                            spotlightClicks={true}
                        />
                        <NavBar />
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
                            {/* {!leftPanelOpen && (
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
                            )} */}

                            {/* Left Panel Toggle Button - shown when left panel is open */}
                            {/* {leftPanelOpen && (
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
                            )} */}

                            {/* Center Panel */}
                            {space === ELICITATION_SPACE.OBSERVABLE &&
                                <Box className="panel center-panel" sx={{ flex: 1 }}>
                                    {/* Univariate and Bivariate Plots */}
                                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
                                        <div className="component-container univariate-container">
                                            <Typography variant="h6" gutterBottom>Univariate Histogram</Typography>
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
                                            <Typography variant="h6" gutterBottom>Bivariate Scatterplot</Typography>
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
                            {/* {rightPanelOpen && feedback === FEEDBACK_MODE.FEEDBACK && (
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
                            )} */}

                            {/* Right Panel Toggle Button - shown when right panel is closed */}
                            {/* {!rightPanelOpen && feedback === FEEDBACK_MODE.FEEDBACK && (
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
                            )} */}

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
                    </Box>
                )}
        </div>
    );
};
