import { Box, Typography, TextField, Button } from "@mui/material";
import { WorkspaceContext, TASK_SETTINGS } from "../contexts/WorkspaceContext";
import { useContext } from "react";
import { VariableContext } from "../contexts/VariableContext";
import "./IntroPage.css";

export default function IntroPage() {
    const { taskId, model } = useContext(WorkspaceContext);
    const { parseVariables } = useContext(VariableContext);

    return (
        // Stage 1: Setup
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Box className='setup-panel'>
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
    )
}