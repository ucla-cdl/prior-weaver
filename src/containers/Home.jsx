import { Box, Typography, Button } from "@mui/material";
import "./Home.css";
import ReactMarkdown from 'react-markdown'

export const Home = () => {
    const title = "Bridging Knowledge Gaps Between Cognitive Goals Across Multiple Readings Of Academic Papers";

    const authors = [
        {
            name: "Brian Roysar",
            email: "brianroysar@ucla.edu",
            affiliation: "University of California, Los Angeles"
        },
        {
            name: "Michael Shi",
            email: "michaelshi@g.ucla.edu",
            affiliation: "University of California, Los Angeles"
        },
        {
            name: "Ollie Pai",
            email: "o.pai@ucla.edu",
            affiliation: "University of California, Los Angeles"
        },
        {
            name: "Yuwei Xiao",
            email: "yuweix@ucla.edu",
            affiliation: "University of California, Los Angeles"
        }
    ]

    const description = `Reading academic papers is a fundamental yet challenging task for students and researchers.\
    Beyond text, papers are dense with data, figures, and statistical analyses, requiring readers to extract key insights, synthesize information, and assess evidence across multiple formats.\
    Researchers must also navigate shifting cognitive goals, switching between different reading strategies based on their evolving needs.\
    Moreover, retaining and organizing insights over time remains a persistent challenge, often leading to redundant work and lost understanding upon revisiting papers.\
    While various reading strategies and digital tools exist, they often fail to comprehensively support researchers in managing their reading process and structuring their acquired knowledge.\
    To address these gaps, we propose **re:ad, an interactive reading system designed to help researchers track their reading process, manage cognitive goals, and systematically organize insights**.\
    By providing a structured and dynamic approach to reading, re:ad aims to reduce cognitive overload and enhance the efficiency of engaging with academic literature.`;

    const links = [
        {
            name: "GitHub",
            url: "https://github.com/olliepai/re-ad"
        },
        {
            name: "Blog",
            url: "https://medium.com/@xshaw2002/user-research-blog-augment-data-intensive-reading-d3fd5546ad55"
        },
        {
            name: "Try re:ad",
            url: "./#/paper-reader"
        }
    ]

    const scrollToBlock = (block) => {
        document.querySelector(block)?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <Box className="home">
            <Box className="title-block" sx={{ p: 2, gap: 3 }}>
                <img src={logo} alt="logo" style={{ width: "300px" }} />
                <Typography variant="h3" sx={{ textAlign: "center", fontWeight: "bold" }}>
                    {title}
                </Typography>
            </Box>

            <Box className="links-block" sx={{ my: 2 }}>
                <Button className="link-button" variant="contained" onClick={() => window.open(links[0].url, "_blank")} startIcon={<GitHub />}>
                    Documentation
                </Button>
                <Button className="link-button" variant="contained" onClick={() => window.open(links[1].url, "_blank")} startIcon={<AutoStories />}>
                    Parameter Space Example
                </Button>
                <Button className="link-button" variant="contained" onClick={() => window.open(links[2].url, "_blank")} startIcon={<img src={icon} style={{ width: "20px", height: "20px" }} />}>
                    Observable Space Example
                </Button>
            </Box>

            <Box className="description-block" sx={{ my: 2 }}>
                <Typography variant="h4">
                    <b>What is re:ad?</b>
                </Typography>
                <ReactMarkdown components={{
                    p: ({ children }) => (
                        <Typography variant="body1" sx={{ lineHeight: 2, my: 2 }}>
                            {children}
                        </Typography>
                    )
                }}>
                    {description}
                </ReactMarkdown>
            </Box>
        </Box>
    )
}