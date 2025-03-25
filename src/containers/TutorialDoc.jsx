import { Box, Typography } from "@mui/material";

export default function TutorialDoc() {

    const TUTORIAL_CLIPS = [
        {
            id: 1,
            title: "Brushing in Multi-view",
            description: "Clip 1 description",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  
        },
        {
            id: 2,
            title: "Draw Distributions in the Histogram",
            description: "Clip 2 description",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        },
        {
            id: 3,
            title: "Linking Data in the Parallel Coordinates Plot",
            description: "Clip 3 description",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        },
        {
            id: 4,
            title: "Generate Data in the Parallel Coordinates Plot",
            description: "Clip 4 description",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        },
        {
            id: 5,
            title: "Modify the Range of Variables in the Parallel Coordinates Plot",
            description: "Clip 5 description",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        },
        
        
    ]

    return (
        <Box className="tutorial-doc">
            <Typography>Tutorial</Typography>
            {Object.entries(TUTORIAL_CLIPS).map(([id, clip]) => (
                <Box key={id} className="clip-box">
                    <Typography>{clip.title}</Typography>
                    <Typography>{clip.description}</Typography>
                    <Box className="video-container">
                        <iframe src={clip.url} title={clip.title} allowFullScreen></iframe>
                    </Box>
                </Box>
            ))}
        </Box>
    );
}   