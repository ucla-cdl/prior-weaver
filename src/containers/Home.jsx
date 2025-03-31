import { Box, Typography, Button } from "@mui/material";
import "./Home.css";
import ReactMarkdown from 'react-markdown'
import { Book, QueryStats, Tune } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import routes from "../shared/routes";
import { useEffect } from "react";


export default function Home() {
    const navigate = useNavigate();
    const title = "Prior Weaver";
    const subtitle = "A tool for supporting users constructively expressing their domain knowledge and eliciting priors for Bayesian models";

    const description = `In Bayesian analysis, we use **prior distributions** to represent our existing knowledge or beliefs about model parameters before seeing data. This process of specifying priors is called **prior elicitation** and is crucial when data is limited or expert knowledge is key.  
Prior elicitation requires translating domain expertise into probability distributions in a systematic way.

**Prior Weaver** helps you express your domain knowledge through an interactive visual interface and automatically translates it into appropriate prior distributions. The tool bridges the gap between domain expertise and statistical modeling, making prior elicitation accessible to both statisticians and domain experts.`;

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
        }
    ]

    useEffect(() => {
        document.title = "Prior Weaver";
    }, []);

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
            </Box>

            <Box className="description-block" sx={{ my: 2 }}>
                <ReactMarkdown>
                    {description}
                </ReactMarkdown>
            </Box>
        </Box>
    )
}