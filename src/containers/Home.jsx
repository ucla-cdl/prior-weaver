import { Box, Typography, Button, Divider } from "@mui/material";
import "./Home.css";
import ReactMarkdown from 'react-markdown'
import { Book, QueryStats, Star, Tune } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import routes from "../shared/routes";
import { useEffect } from "react";

const VIDEOS = [
    {
        name: "PriorWeaver Overview",
        url: "https://drive.google.com/file/d/18LNaVSSTU0kPtOy7mjkJo7kfMb8ZYGYn/preview"
    },
    {
        name: "Introduction to Prior Elicitation",
        url: "https://drive.google.com/file/d/1n4ELXYR4Lj2ml54A07S8ggVXhz_qwZRR/preview"
    },
    {
        name: "Parameter Space Elicitation",
        url: "https://drive.google.com/file/d/16b_8gDtYGrs3XgpUkamgTZJIxdKCdT2x/preview"
    },
    {
        name: "Observable Space Elicitation",
        url: "https://drive.google.com/file/d/1GYB1k3Eu7W1ZA4ckI_Ky9-J-eSNUM0Rh/preview"
    }
]

export default function Home() {
    const location = useLocation();
    const navigate = useNavigate();
    const title = "Prior Weaver";
    const subtitle = "A tool for supporting users constructively expressing their domain knowledge and eliciting priors for Bayesian models";

    const description = "A central aspect of Bayesian analysis is incorporating prior knowledge—assumptions about the modeled domain before observing data. " +
        "Formally, this knowledge is represented as **prior distributions (or simply, priors)**, which define probability distributions over model parameters. " +
        "However, specifying priors can be challenging, as it requires domain expertise that statisticians may not always possess.\n\n" +
        "One approach to addressing this challenge is **prior elicitation**, where statisticians work with domain experts to (1) gather their domain knowledge " + 
        "and (2) translate it into probability distributions, (3) ultimately selecting an appropriate prior.\n\n" + 
        "Conversely, domain experts who wish to apply their knowledge in Bayesian analysis may find it difficult to conduct prior elicitation **independently** without the help from statisticians.\n\n" +
        "To bridge this gap, we introduce ***PriorWeaver*, an interactive system designed to help domain experts express their knowledge and derive appropriate prior distributions for Bayesian models.** " +
        "*PriorWeaver* makes prior elicitation more accessible, facilitating collaboration between statisticians and domain experts while ensuring that domain knowledge is effectively integrated into Bayesian models.";

    const links = [
        {
            name: "Documentation",
            path: routes.doc
        },
        {
            name: "Parameter Space Example",
            path: `${routes.workspace}?example=true&space=parameter`
        },
        {
            name: "Observable Space Example",
            path: `${routes.workspace}?example=true&space=observable`
        },
        {
            name: "Workspace",
            path: routes.workspace
        }
    ]

    useEffect(() => {
        document.title = "Prior Weaver";
        if (sessionStorage.getItem('needReload')) {
            sessionStorage.removeItem('needReload');
            window.location.reload();
        }
    }, [location]);

    const navigateTo = (path) => {
        navigate(path);
    }

    const scrollToBlock = (block) => {
        document.querySelector(block)?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <Box className="home">
            <Box className="title-block" sx={{ p: 2, gap: 3 }}>
                <Typography variant="h3" sx={{ textAlign: "center", fontWeight: "bold" }}>
                    {title}
                </Typography>
            </Box>

            <Box className="links-block" sx={{ my: 2 }}>
                <Button className="link-button" variant="contained" onClick={() => navigateTo(links[0].path)} startIcon={<Book />}>
                    {links[0].name}
                </Button>
                <Button className="link-button" variant="contained" onClick={() => navigateTo(links[1].path)} startIcon={<Tune />}>
                    {links[1].name}
                </Button>
                <Button className="link-button" variant="contained" onClick={() => navigateTo(links[2].path)} startIcon={<QueryStats />}>
                    {links[2].name}
                </Button>
                <Button className="link-button" variant="contained" onClick={() => navigateTo(links[3].path)} startIcon={<Star />}>
                    {links[3].name}
                </Button>
            </Box>

            <Box className="description-block" sx={{ my: 2 }}>
                <ReactMarkdown children={description} />
            </Box>

            {VIDEOS.map((video, index) => (
                <Box className="video-block" sx={{ my: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <Typography sx={{ my: 2, fontWeight: "bold" }} variant="h4"><u>{video.name}</u></Typography>
                    <iframe src={video.url} className="video-container"></iframe>
                    <Divider sx={{ my: 3, width: "100%", color: "black", border: "1px solid black" }} />
                </Box>
            ))}
        </Box>
    )
}