import React, { useContext, useState } from 'react';
import { Box, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { WorkspaceContext, TASK_SETTINGS, ELICITATION_SPACE, FEEDBACK_MODE } from '../contexts/WorkspaceContext';

const Admin = () => {
    const { task, setTask, space, setSpace, feedback, setFeedback } = useContext(WorkspaceContext);

    const [selectedTaskId, setSelectedTaskId] = useState(task.id);

    const handleSwitchTask = (taskId) => {
        setSelectedTaskId(taskId);
        setTask(TASK_SETTINGS[taskId]);
    }

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', gap: 2 }}>
            {/* Elicitation Space */}
            <FormControl>
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
            <FormControl>
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
            <FormControl>
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
    );
};

export default Admin;