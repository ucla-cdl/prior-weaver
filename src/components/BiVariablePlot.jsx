import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Button, Grid2 } from '@mui/material';

export default function BiVariablePlot({ biVariable1, biVariable2, updateVariable, updateBivariable }) {
    const chartWidth = 800;
    const chartHeight = 800;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const marginalPlotWidth = 100; // y-axis marginal hist
    const marginalPlotHeight = 100; // x-axis marginal hist
    const mainPlotWidth = chartWidth - margin.left - margin.right - marginalPlotWidth;
    const mainPlotHeight = chartHeight - margin.top - margin.bottom - marginalPlotHeight;

    const MODES = ["PREDICT", "CHIP"];
    const [bivariateMode, setBivariateMode] = useState('PREDICT');

    const [xScale, setXScale] = useState('');
    const [yScale, setYScale] = useState('');

    useEffect(() => {
        console.log("draw bi plot")
        drawPlot();
        drawGridPlot();
    }, [])
    useEffect(() => {
        console.log("draw margin plot");
        drawMarginPlot();
    }, [biVariable1.counts, biVariable2.counts])

    const drawPlot = () => {
        document.getElementById("bivariate-distribution-div").innerHTML = "";

        let svg = d3.select("#bivariate-distribution-div").append("svg")
            .attr("id", "bivariate-svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);

        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        // create a group for main plot
        const mainPlot = svg.append("g")
            .attr("id", "bivariate-main-plot")
            .attr("transform", `translate(${margin.left}, ${margin.top + marginalPlotHeight})`)

        // Draw X axis
        mainPlot.append('g')
            .attr('transform', `translate(0, ${mainPlotHeight})`)
            .call(d3.axisBottom(xScale)
                .tickValues(biVariable1.binEdges)
                .tickSize(-mainPlotHeight))  // Extend the tick lines across the width of the chart
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        // Draw Y axis
        mainPlot.append('g')
            .attr("transform", `translate(0, 0)`)
            .call(d3.axisLeft(yScale)
                .tickValues(biVariable2.binEdges)
                .tickSize(-mainPlotWidth))  // Extend the tick lines across the width of the chart
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        svg.selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");
    }

    const drawGridPlot = () => {
        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);

        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        let mainPlot = d3.select("#bivariate-main-plot")
        // create interactive grid cells
        for (let i = 0; i < biVariable1.binEdges.length - 1; i++) {
            const curGridX = xScale(biVariable1.binEdges[i]);
            const nextGridX = xScale(biVariable1.binEdges[i + 1]);
            for (let j = 0; j < biVariable2.binEdges.length - 1; j++) {
                const curGridY = yScale(biVariable2.binEdges[j]);
                const nextGridY = yScale(biVariable2.binEdges[j + 1]);

                mainPlot.append("rect")
                    .attr("class", "grids")
                    .attr("x", curGridX)
                    .attr("y", nextGridY)
                    .attr("width", nextGridX - curGridX)
                    .attr("height", curGridY - nextGridY)
                    .attr("fill", "transparent")
                    .attr("stroke", "lightgray")
                    .on("mouseover", function () {
                        d3.select(this)
                            .attr("fill", "whitesmoke")
                            .attr("stroke", "gray");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .attr("fill", "transparent")
                            .attr("stroke", "lightgray");
                    })
            }
        }
    }

    const drawMarginPlot = () => {
        let svg = d3.select("#bivariate-svg");
        d3.select("#margin-x-plot").remove();
        d3.select("#margin-y-plot").remove();

        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);

        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        // create marginal dot plot (top) - variable 1
        let xChipData = [];
        biVariable1.counts.forEach((count, index) => {
            const x0 = biVariable1.binEdges[index];
            const x1 = biVariable1.binEdges[index + 1];
            const binCenter = (x0 + x1) / 2;

            // Add dots for each count, each dot will be placed in the bin
            for (let i = 0; i < count; i++) {
                xChipData.push({ binCenter, row: i, used: false }); // row is the stacking level
            }
        });

        // Define the y-scale to control how the dots stack
        const dotRadius = 5; // Radius of each dot
        const yDotScale = d3.scaleLinear()
            .domain([0, d3.max(biVariable1.counts)]) // Scale based on maximum count
            .range([marginalPlotHeight, 0]); // Dots will stack upwards

        // create marginal dot plot (right) - variable 2
        let yChipData = [];
        biVariable2.counts.forEach((count, index) => {
            const y0 = biVariable2.binEdges[index];
            const y1 = biVariable2.binEdges[index + 1];
            const binCenter = (y0 + y1) / 2; // Center of the bin

            // Add dots for each count, each dot will be placed in the bin
            for (let i = 0; i < count; i++) {
                yChipData.push({ binCenter, row: i, used: false }); // row is the stacking level
            }
        });

        // Define the x-scale to control how the dots stack horizontally
        const xDotScale = d3.scaleLinear()
            .domain([0, d3.max(biVariable2.counts)]) // Scale based on maximum count
            .range([0, marginalPlotWidth]); // Dots will stack leftwards

        // Append the dots
        let marginalXPlot = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`)
            .attr("id", "margin-x-plot");

        marginalXPlot
            .selectAll("circle")
            .data(xChipData)
            .enter()
            .append("circle")
            .attr("class", "x-dot")
            .attr("cx", d => xScale(d.binCenter)) // Place dot at the bin's center on the x-axis
            .attr("cy", d => yDotScale(d.row + 1)) // Stack dots by their row value
            .attr("r", dotRadius) // Set radius of the dot
            .style("fill", "white")
            .style("stroke", "black")
            .style("stroke-width", "1px")

        // Append the dots for the marginal y-axis dot plot
        let marginalYPlot = svg.append("g")
            .attr("transform", `translate(${margin.left + mainPlotWidth}, ${margin.top + marginalPlotHeight})`)
            .attr("id", "margin-y-plot");

        marginalYPlot
            .selectAll("circle")
            .data(yChipData)
            .enter()
            .append("circle")
            .attr("class", "y-dot")
            .attr("cx", d => xDotScale(d.row + 1)) // Stack dots by their row value (horizontally)
            .attr("cy", d => yScale(d.binCenter)) // Place dot at the bin's center on the y-axis
            .attr("r", dotRadius) // Set radius of the dot
            .style("fill", "white")
            .style("stroke", "black")
            .style("stroke-width", "1px")

        const mainPlot = d3.select("#bivariate-main-plot");
        d3.selectAll(".grids")
            .on("click", function (event) {
                const [clickX, clickY] = d3.pointer(event);

                let clickValueX = xScale.invert(clickX);
                let clickValueY = yScale.invert(clickY);

                for (let binIndexX = 0; binIndexX < biVariable1.binEdges.length - 1; binIndexX++) {
                    const xEdge1 = biVariable1.binEdges[binIndexX];
                    const xEdge2 = biVariable1.binEdges[binIndexX + 1];

                    // Find the correspond X bin
                    if (xEdge1 <= clickValueX && clickValueX <= xEdge2) {
                        for (let binIndexY = 0; binIndexY < biVariable2.binEdges.length - 1; binIndexY++) {
                            const yEdge1 = biVariable2.binEdges[binIndexY];
                            const yEdge2 = biVariable2.binEdges[binIndexY + 1];

                            // Find the correspond Y bin
                            if (yEdge1 <= clickValueY && clickValueY <= yEdge2) {
                                // User draw lines to predict the trend/relation
                                if (bivariateMode == "PREDICT") {
                                    mainPlot.append("circle")
                                        .attr("class", "predict-dot")
                                        .attr("cx", clickX)
                                        .attr("cy", clickY)
                                        .attr("r", 5)
                                        .style("fill", "orange")
                                        .style("opacity", 0.7)

                                    let newBivar1Counts = [...biVariable1.counts];
                                    let newBivar2Counts = [...biVariable2.counts];
                                    newBivar1Counts[binIndexX] += 1;
                                    newBivar2Counts[binIndexY] += 1;
                                    updateVariable(biVariable1.name, "counts", newBivar1Counts);
                                    updateVariable(biVariable2.name, "counts", newBivar2Counts);

                                    // Select and sort dots by their 'cx' (x value)
                                    const predictDots = d3.selectAll(".predict-dot").nodes();
                                    const sortedPredictDots = predictDots.sort((a, b) => d3.select(a).attr("cx") - d3.select(b).attr("cx"));

                                    // Draw lines connecting the dots after sorting
                                    d3.selectAll(".predict-line").remove();
                                    for (let i = 0; i < sortedPredictDots.length - 1; i++) {
                                        const dot1 = d3.select(sortedPredictDots[i]);
                                        const dot2 = d3.select(sortedPredictDots[i + 1]);

                                        mainPlot.append("line")
                                            .attr("class", "predict-line")
                                            .attr("x1", dot1.attr("cx"))
                                            .attr("y1", dot1.attr("cy"))
                                            .attr("x2", dot2.attr("cx"))
                                            .attr("y2", dot2.attr("cy"))
                                            .attr("stroke", "black")
                                            .attr("stroke-width", 2);
                                    }
                                }
                                // User move chips from margins to the grid plot
                                else if (bivariateMode == "CHIP") {

                                    let xChip = xChipData
                                        .filter(d => d.binCenter === (biVariable1.binEdges[binIndexX] + biVariable1.binEdges[binIndexX + 1]) / 2 && !d.used)
                                        .sort((a, b) => a.row - b.row)[0]

                                    let yChip = yChipData
                                        .filter(d => d.binCenter === (biVariable2.binEdges[binIndexY] + biVariable2.binEdges[binIndexY + 1]) / 2 && !d.used)
                                        .sort((a, b) => a.row - b.row)[0]

                                    if (xChip && yChip) {
                                        d3.selectAll(".x-dot")
                                            .filter(d => d.binCenter === xChip.binCenter && d.row === xChip.row)
                                            .style("fill", "gray");

                                        d3.selectAll(".y-dot")
                                            .filter(d => d.binCenter === yChip.binCenter && d.row === yChip.row)
                                            .style("fill", "gray");

                                        xChip.used = true;
                                        yChip.used = true;

                                        mainPlot.append("circle")
                                            .attr("class", "chip-dot")
                                            .attr("cx", clickX)
                                            .attr("cy", clickY)
                                            .attr("r", 5)
                                            .style("fill", "blue")
                                            .style("opacity", 0.7)
                                            .on("dblclick", function (event) {
                                                let revokeXDot = xChipData
                                                    .filter(d => d.binCenter === (biVariable1.binEdges[binIndexX] + biVariable1.binEdges[binIndexX + 1]) / 2 && d.used)
                                                    .sort((a, b) => b.row - a.row)[0];

                                                let revokeYDot = yChipData
                                                    .filter(d => d.binCenter === (biVariable2.binEdges[binIndexY] + biVariable2.binEdges[binIndexY + 1]) / 2 && d.used)
                                                    .sort((a, b) => b.row - a.row)[0];

                                                d3.selectAll(".x-dot")
                                                    .filter(d => d.binCenter === revokeXDot.binCenter && d.row === revokeXDot.row)
                                                    .style("fill", "white");

                                                d3.selectAll(".y-dot")
                                                    .filter(d => d.binCenter === revokeYDot.binCenter && d.row === revokeYDot.row)
                                                    .style("fill", "white");

                                                revokeXDot.used = false;
                                                revokeYDot.used = false;

                                                d3.select(this).remove();
                                            })
                                    }

                                    break;
                                }

                            }
                        }
                    }
                }
            })
    }

    const changeBivariateMode = (mode) => {
        setBivariateMode(mode);
    }

    return (
        <div>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button variant={bivariateMode == "PREDICT" ? "contained" : "outlined"} onClick={() => changeBivariateMode("PREDICT")}>PREDICT</Button>
                <Button variant={bivariateMode == "CHIP" ? "contained" : "outlined"} onClick={() => changeBivariateMode("CHIP")}>CHIP</Button>
            </Box>
            <div id='bivariate-distribution-div'>

            </div>
        </div>
    )
}