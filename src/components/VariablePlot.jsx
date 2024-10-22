import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { logUserBehavior } from '../utils/BehaviorListener';
import axios from "axios";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, CardActions, CardContent, Grid2, IconButton, Paper, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShowChartIcon from '@mui/icons-material/ShowChart';

// Define the Variable Component
export default function VariablePlot({ variable, updateVariable }) {
    const chartHeight = 400;
    const offsetX = 60;
    const offsetY = 60;
    const toggleHeight = 8;
    const titleOffset = 50;

    const [isFitting, setIsFitting] = useState(false);
    const [fittedDistributions, setFittedDistributions] = useState([]);

    useEffect(() => {
        drawPlot();
        console.log("draw plot")
    }, []);

    useEffect(() => {
        drawIVHistogram();
    }, [variable.counts]);

    const drawPlot = () => {
        const divID = "univariate-div-" + variable.name;
        document.getElementById(divID).innerHTML = "";
        const chartWidth = document.getElementById(divID).clientWidth;

        let svg = d3.select("#" + divID).append("svg")
            .attr("id", "univariate-svg-" + variable.name)
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        svg.append("g")
            .attr("id", "univariate-histogram-" + variable.name);

        svg.append("g")
            .attr("id", "univariate-selected-distribution-" + variable.name);

        svg.append("g")
            .attr("id", "univariate-fitted-distribution-" + variable.name);
    }

    const drawIVHistogram = () => {
        // Clear the existing SVG
        document.getElementById("univariate-histogram-" + variable.name).innerHTML = "";
        let histogramPlot = d3.select("#univariate-histogram-" + variable.name);
        histogramPlot.lower();

        const chartWidth = document.getElementById("univariate-div-" + variable.name).clientWidth;
        let xScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([offsetX, chartWidth - offsetX]);

        let maxY = d3.max(variable.counts) < 8 ? 10 : d3.max(variable.counts) + 2;
        let yScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([chartHeight - offsetY, offsetY]);

        // Draw X axis
        histogramPlot.append('g')
            .attr('transform', `translate(0, ${chartHeight - offsetY})`)
            .call(d3.axisBottom(xScale)
                .tickValues(variable.binEdges)
                .tickFormat(d3.format("d")))
            .selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");

        histogramPlot.append("text")
            .attr("text-anchor", "middle")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight - offsetY + titleOffset)
            .style("font-size", "16px")
            .text(variable.name);

        // Draw Y axis
        histogramPlot.append('g')
            .attr('transform', `translate(${offsetX}, 0)`)
            .call(d3.axisLeft(yScale))
            .selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");

        // Draw Histogram Bars
        let bars = histogramPlot.selectAll('rect')
            .data(variable.counts)
            .enter()
            .append('rect')
            .attr('x', (d, i) => xScale(variable.binEdges[i]))
            .attr('y', d => yScale(d))
            .attr('width', (d, i) => xScale(variable.binEdges[i + 1]) - xScale(variable.binEdges[i]))
            .attr('height', d => chartHeight - offsetY - yScale(d))
            .style('fill', 'lightblue')  // Light color for preview
            .style('stroke', 'black');

        // Add labels on top of bars
        let labels = histogramPlot.selectAll('text.label')
            .data(variable.counts)
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', (d, i) => (xScale(variable.binEdges[i]) + xScale(variable.binEdges[i + 1])) / 2)
            .attr('y', d => yScale(d) - 10)
            .attr('text-anchor', 'middle')
            .text(d => d)
            .style('font-size', 14)
            .style('font-family', 'Times New Roman')
            .style('fill', 'black');

        let dragBehavior = d3.drag()
            .on('drag', function (event) {
                // Find the index of the current circle (toggle) being dragged
                const index = d3.select(this).datum();
                // Convert y-coordinate to bin height (rounded to nearest integer)
                let newHeight = Math.round(yScale.invert(event.y));
                // Ensure newHeight is constrained to valid values
                newHeight = Math.max(0, Math.min(newHeight, maxY));
                // Update the bar height
                d3.select(bars.nodes()[index])
                    .attr('y', yScale(newHeight))
                    .attr('height', chartHeight - offsetY - yScale(newHeight));
                // Update the label
                d3.select(labels.nodes()[index])
                    .attr('y', yScale(newHeight) - 10)
                    .text(newHeight);
                // Update the position of the toggle
                d3.select(this)
                    .attr('y', yScale(newHeight) - toggleHeight);
            })
            .on('end', function (event) {
                // Find the index of the current circle (toggle) being dragged
                const index = d3.select(this).datum();
                // Convert y-coordinate to bin height (rounded to nearest integer)
                let newHeight = Math.round(yScale.invert(event.y));
                newHeight = Math.max(0, Math.min(newHeight, maxY));
                // Update counts array
                let newCounts = [...variable.counts];
                logUserBehavior(`uni-plot(${variable.name})`, "drag", `adjust distribution at bin-${index}`, `${newCounts[index]} -> ${newHeight}`)
                newCounts[index] = newHeight;
                updateVariable(variable.name, "counts", newCounts);
            });

        histogramPlot.selectAll('rect.toggle')
            .data(d3.range(variable.counts.length))  // Use the index range as data
            .enter()
            .append('rect')
            .attr('class', 'toggle')
            .attr('x', d => xScale(variable.binEdges[d]))
            .attr('y', d => yScale(variable.counts[d]) - toggleHeight)  // Use counts[d] since d is the index now
            .attr('width', d => xScale(variable.binEdges[d + 1]) - xScale(variable.binEdges[d]))
            .attr('height', toggleHeight)
            .attr('rx', 5)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', '1px')
            .call(dragBehavior);
    }

    const fitData = () => {
        axios
            .post(window.BACKEND_ADDRESS + "/fitVarDist", {
                bin_edges: variable.binEdges,
                counts: variable.counts
            })
            .then((resp) => {
                console.log(resp.data);
                setFittedDistributions(resp.data);
                setIsFitting(true);
            })
    }

    // TODO: 
    // 1. yscale adaption - redraw selected if fitted cause change in yscale; ===done=== 
    // 1.1 y axis not update ===done===
    // 2. material ui - TAB for univariate distributions ===done===
    // 3. adding cues and titles for each feature so users can understand  
    // 4. linear regression for bivar
    const drawFittedDistribution = (name, fittedX, fittedY) => {
        document.getElementById("univariate-fitted-distribution-" + variable.name).innerHTML = "";
        let distributionPlot = d3.select("#univariate-fitted-distribution-" + variable.name);

        const chartWidth = document.getElementById("univariate-div-" + variable.name).clientWidth;
        const xPdfScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([offsetX, chartWidth - offsetX]);

        let maxY = d3.max(fittedY);
        let drawAxisY = false;
        if (variable.distributions.length > 0) {
            let selectedDistribution = variable.distributions[variable.distributions.length - 1];
            let selectedMaxY = d3.max(selectedDistribution.p);
            if (selectedMaxY < maxY) {
                drawSelectedDistribution(selectedDistribution.x, selectedDistribution.p, maxY);
            }
            else {
                maxY = selectedMaxY;
            }
        }
        else {
            drawAxisY = true;
        }

        const yPdfScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([chartHeight - offsetY, offsetY]);

        if (drawAxisY) {
            distributionPlot.append('g')
                .attr('transform', `translate(${chartWidth - offsetX}, 0)`)
                .call(d3.axisRight(yPdfScale))
                .selectAll(".tick text")
                .style("font-size", 15)
                .style("font-family", "Times New Roman");
        }

        const line = d3.line()
            .x((d, i) => xPdfScale(fittedX[i]))
            .y((d, i) => yPdfScale(fittedY[i]));

        distributionPlot.append("path")
            .datum(fittedY)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    const showFittedPDF = (fittedData) => {
        drawFittedDistribution(fittedData.name, fittedData.x, fittedData.p)
    }

    const drawSelectedDistribution = (fittedX, fittedY, maxValueY = null) => {
        document.getElementById("univariate-selected-distribution-" + variable.name).innerHTML = "";
        document.getElementById("univariate-fitted-distribution-" + variable.name).innerHTML = "";

        let distributionPlot = d3.select("#univariate-selected-distribution-" + variable.name);

        const chartWidth = document.getElementById("univariate-div-" + variable.name).clientWidth;
        const xPdfScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([offsetX, chartWidth - offsetX]);

        let maxY = d3.max(fittedY);
        if (maxValueY) {
            maxY = maxValueY;
        }

        const yPdfScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([chartHeight - offsetY, offsetY]);

        // Draw Y axis
        distributionPlot.append('g')
            .attr('transform', `translate(${chartWidth - offsetX}, 0)`)
            .call(d3.axisRight(yPdfScale))
            .selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");

        const line = d3.line()
            .x((d, i) => xPdfScale(fittedX[i]))
            .y((d, i) => yPdfScale(fittedY[i]));

        distributionPlot.append("path")
            .datum(fittedY)
            .attr("fill", "none")
            .attr("stroke", "orange")
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    const selectFittedPDF = (fittedData) => {
        let newDistributions = [...variable.distributions];
        newDistributions.push(fittedData);
        drawSelectedDistribution(fittedData.x, fittedData.p);
        updateVariable(variable.name, "distributions", newDistributions);
        setIsFitting(false);
    }

    return (
        <Grid2 container spacing={2} >
            <Grid2 size={8}>
                <Paper elevation={3} sx={{ width: "100%", height: chartHeight }} id={"univariate-div-" + variable.name}></Paper>
            </Grid2>
            <Grid2 size={4} >
                <Paper elevation={5} sx={{ height: chartHeight, overflowY: 'scroll' }}>
                    {isFitting ?
                        <Box>
                            <h4>Fitted Distributions</h4>
                            {fittedDistributions?.map((fittedData, index) => (
                                <Card key={index} elevation={2} sx={{ m: 2, border: '1px solid black' }}>
                                    <CardContent>
                                        <h5>
                                            {fittedData.name}
                                        </h5>
                                        {/* Parameters */}
                                        <Accordion>
                                            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
                                                <Typography>
                                                    Parameters
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {Object.entries(fittedData.params).map(([param, value]) => (
                                                    <Typography key={param} sx={{ color: 'text.secondary' }}>
                                                        {param}: {value}
                                                    </Typography>
                                                ))}
                                            </AccordionDetails>
                                        </Accordion>
                                        {/* Evaluation Metrics */}
                                        <Accordion>
                                            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
                                                <Typography>
                                                    Metrics
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {Object.entries(fittedData.metrics).map(([metric, value]) => (
                                                    <Typography key={metric} sx={{ color: 'text.secondary' }}>
                                                        {metric}: {value}
                                                    </Typography>
                                                ))}
                                            </AccordionDetails>
                                        </Accordion>
                                    </CardContent>
                                    <CardActions>
                                        <IconButton onClick={() => showFittedPDF(fittedData)}>
                                            <ShowChartIcon />
                                        </IconButton>
                                        <IconButton onClick={() => selectFittedPDF(fittedData)}>
                                            <CheckCircleIcon />
                                        </IconButton>
                                        <IconButton>
                                            <DeleteIcon />
                                        </IconButton>
                                    </CardActions>
                                </Card>
                            ))}
                        </Box>
                        :
                        <Box>
                            <h4>Distributions</h4>
                            <Button variant="outlined" onClick={fitData}>Fit New Distributions</Button>
                            {/* Selected Distributions */}
                            {variable.distributions.reverse().map((distribution, index) => (
                                <Card key={index} elevation={2} sx={{ m: 2, border: index == 0 ? '2px solid orange' : '1px solid black' }}>
                                    <CardContent>
                                        <h5>#{variable.distributions.length - index} {distribution.name}</h5>
                                        {/* Parameters */}
                                        <Accordion>
                                            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
                                                <Typography>
                                                    Parameters
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {Object.entries(distribution.params).map(([param, value]) => (
                                                    <Typography key={param} sx={{ color: 'text.secondary' }}>
                                                        {param}: {value}
                                                    </Typography>
                                                ))}
                                            </AccordionDetails>
                                        </Accordion>
                                        {/* Evaluation Metrics */}
                                        <Accordion>
                                            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
                                                <Typography>
                                                    Metrics
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {Object.entries(distribution.metrics).map(([metric, value]) => (
                                                    <Typography key={metric} sx={{ color: 'text.secondary' }}>
                                                        {metric}: {value}
                                                    </Typography>
                                                ))}
                                            </AccordionDetails>
                                        </Accordion>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    }
                </Paper>
            </Grid2>
        </Grid2 >
    );
};