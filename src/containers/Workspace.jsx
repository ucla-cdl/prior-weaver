import React, { useState, useRef, useEffect, useContext } from 'react';
import "./Workspace.css";

import { Box, Typography, Tooltip, Button, TextField, IconButton, Skeleton } from '@mui/material';
import ModelPanel from '../components/ModelPanel';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';
import ParallelSankeyPlot from '../components/ParallelSankeyPlot';
import ResultsPanel from '../components/ResultsPanel';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import UndoIcon from '@mui/icons-material/Undo';

import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const { scenario, finishParseCode, leftPanelOpen, setLeftPanelOpen, rightPanelOpen, setRightPanelOpen } = useContext(WorkspaceContext);
    const { stanCode, setStanCode, handleStanCode, variablesDict, biVariable1, biVariable2 } = useContext(VariableContext);
    const { currentVersion, getUndoOperationDescription, undoEntityOperation, redoEntityOperation } = useContext(EntityContext);

    useEffect(() => {
        console.log("Workspace mounted - Backend at ", window.BACKEND_ADDRESS);
    }, []);

    return (
        <div className='workspace-div'>
            {!finishParseCode ?
                (
                    // Stage 1: Setup
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        maxWidth: '600px',
                        margin: '0 auto',
                        padding: '20px'
                    }}>
                        <Typography variant="h4" gutterBottom>
                            Scenario
                        </Typography>
                        <Typography paragraph sx={{ mb: 4 }}>
                            {scenario}
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
                            value={stanCode}
                            onChange={(e) => setStanCode(e.target.value)}
                        />
                        <Button
                            disabled={!stanCode}
                            onClick={handleStanCode}
                            variant="contained"
                            size="large"
                        >
                            Continue
                        </Button>
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
                        <Box className="panel center-panel" sx={{ flex: 1 }}>
                            {/* Add the undo button near the top of the center panel */}
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

                        {/* Right Panel Toggle Button - shown when right panel is open */}
                        {rightPanelOpen && (
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
                        {!rightPanelOpen && (
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
                    </Box>
                )}
        </div>
    );
};
