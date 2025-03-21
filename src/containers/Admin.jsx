import React, { useContext, useState } from 'react';
import { Box, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button, Typography, Snackbar, Alert } from '@mui/material';
import { TASK_SETTINGS, ELICITATION_SPACE, FEEDBACK_MODE, WorkspaceContext } from '../contexts/WorkspaceContext';
import axios from 'axios';

const Admin = () => {
    const { taskId, space, feedback, setTaskId, setSpace, setFeedback, examplePlayground, setExamplePlayground } = useContext(WorkspaceContext);
    const [notification, setNotification] = useState(null);

    const handleSaveSettings = () => {
        axios
            .post(window.BACKEND_ADDRESS + '/admin/study-settings', {
                task_id: taskId,
                elicitation_space: space,
                feedback_mode: feedback,
                example_playground: examplePlayground
            })
            .then(() => {
                setNotification("Settings saved successfully!");
            })
            .catch((error) => {
                setNotification("Error saving settings: " + error.response.data.detail);
            });
    }

    const handleChangeExamplePlayground = (e) => {
        setExamplePlayground(e.target.value === "true");
        if (e.target.value === "true") {
            setTaskId("house");
        }
    }

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, p: 3 }}>
            <Typography variant="h4">Study Settings</Typography>
            {/* Tutorial */}
            <FormControl
                sx={{
                    position: 'relative',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '2px',
                    p: 2
                }}
            >
                <FormLabel id="demo-row-radio-buttons-group-label">Example Playground</FormLabel>
                <RadioGroup
                    row
                    aria-labelledby="demo-row-radio-buttons-group-label"
                    name="row-radio-buttons-group"
                    value={examplePlayground}
                    onChange={handleChangeExamplePlayground}
                >
                    <FormControlLabel value={true} control={<Radio />} label="Yes" />
                    <FormControlLabel value={false} control={<Radio />} label="No" />
                </RadioGroup>
            </FormControl>
            {/* Task */}
            <FormControl
                sx={{
                    position: 'relative',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '2px',
                    p: 2
                }}
            >
                <FormLabel id="demo-row-radio-buttons-group-label">Task</FormLabel>
                <RadioGroup
                    row
                    aria-labelledby="demo-row-radio-buttons-group-label"
                    name="row-radio-buttons-group"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                >
                    {Object.values(TASK_SETTINGS).map((t) => (
                        <FormControlLabel key={t.id} value={t.id} control={<Radio />} label={t.name} disabled={examplePlayground}/>
                    ))}
                </RadioGroup>
            </FormControl>
            {/* Conditions */}
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
                {/* Elicitation Space */}
                <FormControl
                    sx={{
                        position: 'relative',
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        borderRadius: '2px',
                        p: 2
                    }}
                >
                    <FormLabel id="demo-row-radio-buttons-group-label">Elicitation Space</FormLabel>
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
                    }}
                >
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
            </Box>

            <Button variant="contained" color="primary" onClick={handleSaveSettings}>Save Settings</Button>
            <Snackbar
                open={Boolean(notification)}
                autoHideDuration={3000}
                onClose={() => setNotification(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setNotification(null)} severity="success">
                    Settings saved successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Admin;