import { Box, Typography, TextField, Button, CircularProgress } from "@mui/material";
import { WorkspaceContext, TASK_SETTINGS } from "../contexts/WorkspaceContext";
import { useContext } from "react";
import { VariableContext } from "../contexts/VariableContext";
import "./IntroPage.css";
import { InlineMath } from 'react-katex';

export default function IntroPage() {
    const { taskId, model, finishFetchingStudySettings } = useContext(WorkspaceContext);
    const { finishParseModel, parseVariables } = useContext(VariableContext);

    return (
        // Stage 1: Setup
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {finishFetchingStudySettings ?
                <Box className='setup-panel'>
                    {/* Scenario and Code Input */}
                    <Box sx={{ width: '100%', boxSizing: 'border-box', my: 1, p: 4, borderBottom: '1px solid #ddd' }}>
                        <Typography variant="h4" gutterBottom>
                            Scenario
                        </Typography>
                        <Typography variant='h6'>
                            {TASK_SETTINGS[taskId]?.scenario}
                        </Typography>
                    </Box>
                    <Box sx={{ width: '100%', boxSizing: 'border-box', my: 1, p: 4, borderBottom: '1px solid #ddd' }}>
                        <Typography variant="h4" gutterBottom>
                            Model Settings
                        </Typography>
                        <Box sx={{ my: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                            {taskId && Object.entries(TASK_SETTINGS[taskId]?.variables)?.map(([type, variables]) => (
                                <Box key={type} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid #ddd', pb: 1 }}>
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
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Typography variant='h5'>Model</Typography>
                                <h4><InlineMath math={model} /></h4>
                            </Box>
                        </Box>
                    </Box>
                </Box>
                :
                <Box className='setup-panel'>
                    <CircularProgress />
                </Box>
            }
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
    )
}