import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Button, Grid2 } from '@mui/material';

export default function BiVariablePlot({ biVariableDict, biVariable1, biVariable2, updateVariable, updateBivariable }) {
    const chartWidth = 800;
    const chartHeight = 800;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const marginalPlotWidth = 100; // y-axis marginal hist
    const marginalPlotHeight = 100; // x-axis marginal hist
    const mainPlotWidth = chartWidth - margin.left - margin.right - marginalPlotWidth;
    const mainPlotHeight = chartHeight - margin.top - margin.bottom - marginalPlotHeight;
    const dotRadius = 5; // Radius of each dot

    const MODES = ["PREDICT", "CHIP"];
    const [bivariateMode, setBivariateMode] = useState('PREDICT');

    const [xScale, setXScale] = useState('');
    const [yScale, setYScale] = useState('');
    const [biVariable, setBivariable] = useState();
    const biVarName = biVariable1.name + "-" + biVariable2.name;

    useEffect(() => {
        console.log("bivariate change", biVarName);
        drawPlot();
        drawGridPlot();
    }, [biVariable1.name, biVariable2.name])

    useEffect(() => {
        console.log("draw margin plot");
        drawMarginPlot();
    }, [biVariable1.counts, biVariable2.counts, bivariateMode])

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
        const svg = d3.select("#bivariate-svg");
        const mainPlot = d3.select("#bivariate-main-plot");

        d3.select("#margin-x-plot").remove();
        d3.select("#margin-y-plot").remove();

        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);

        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        let predictionDots = biVariableDict[biVarName].predictionDots;
        let chipDots = biVariableDict[biVarName].chipDots;

        // create marginal dot plot (top) - variable 1
        let maxDotY = d3.max(biVariable1.counts) < 8 ? 10 : d3.max(biVariable1.counts) + 2;
        let maxDotX = d3.max(biVariable2.counts) < 8 ? 10 : d3.max(biVariable2.counts) + 2;

        let xDotData = [];
        biVariable1.counts.forEach((count, index) => {
            const x0 = biVariable1.binEdges[index];
            const x1 = biVariable1.binEdges[index + 1];
            const binCenter = (x0 + x1) / 2;
            let usedDotsCnt = predictionDots.filter(d => x0 <= d.x && d.x <= x1).length + chipDots.filter(d => x0 <= d.x && d.x <= x1).length;

            // Add dots for each count, each dot will be placed in the bin
            for (let i = 0; i < count; i++) {
                xDotData.push({
                    position: binCenter,
                    row: i,
                    used: i < usedDotsCnt ? true : false
                });
            }
        });

        // create marginal dot plot (right) - variable 2
        let yDotData = [];
        biVariable2.counts.forEach((count, index) => {
            const y0 = biVariable2.binEdges[index];
            const y1 = biVariable2.binEdges[index + 1];
            const binCenter = (y0 + y1) / 2;
            let usedDotsCnt = predictionDots.filter(d => y0 <= d.y && d.y <= y1).length + chipDots.filter(d => y0 <= d.y && d.y <= y1).length;

            // Add dots for each count, each dot will be placed in the bin
            for (let i = 0; i < count; i++) {
                yDotData.push({
                    position: binCenter,
                    row: i,
                    used: i < usedDotsCnt ? true : false
                });
            }
        });

        // Define the x-scale to control how the dots stack horizontally
        const xDotScale = d3.scaleLinear()
            .domain([0, maxDotX])
            .range([0, marginalPlotWidth]); // Dots will stack leftwards
        // Define the y-scale to control how the dots stack
        const yDotScale = d3.scaleLinear()
            .domain([0, maxDotY])
            .range([marginalPlotHeight, 0]); // Dots will stack upwards
        // Append the margin dots for the marginal x-axis dot plot
        let marginalXPlot = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`)
            .attr("id", "margin-x-plot");
        marginalXPlot
            .selectAll("circle")
            .data(xDotData)
            .enter()
            .append("circle")
            .attr("class", "x-dot")
            .attr("cx", d => xScale(d.position)) // Place dot at the bin's center on the x-axis
            .attr("cy", d => yDotScale(d.row + 1)) // Stack dots by their row value
            .attr("r", dotRadius) // Set radius of the dot
            .style("fill", d => d.used ? "gray" : "white")
            .style("stroke", "black")
            .style("stroke-width", "1px")
        // Append the margin dots for the marginal y-axis dot plot
        let marginalYPlot = svg.append("g")
            .attr("transform", `translate(${margin.left + mainPlotWidth}, ${margin.top + marginalPlotHeight})`)
            .attr("id", "margin-y-plot");
        marginalYPlot
            .selectAll("circle")
            .data(yDotData)
            .enter()
            .append("circle")
            .attr("class", "y-dot")
            .attr("cx", d => xDotScale(d.row + 1)) // Stack dots by their row value (horizontally)
            .attr("cy", d => yScale(d.position)) // Place dot at the bin's center on the y-axis
            .attr("r", dotRadius) // Set radius of the dot
            .style("fill", d => d.used ? "gray" : "white")
            .style("stroke", "black")
            .style("stroke-width", "1px")

        // plot the prediction dots
        mainPlot.selectAll("circle")
            .data(predictionDots)
            .enter()
            .append("circle")
            .attr("class", "predict-dot")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", dotRadius)
            .attr("fill", "orange")
            .on("dblclick", d => {
                const { binIndexX, binIndexY } = findGird(d.x, d.y);
                d3.select(this).remove();
                updatePredictionDots("minus", mainPlot, xScale, yScale, binIndexX, binIndexY);
            })
        // plot the chip dots
        mainPlot.selectAll("circle")
            .data(chipDots)
            .enter()
            .append("circle")
            .attr("class", "chip-dot")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", dotRadius)
            .attr("fill", "blue")
            .on("dblclick", d => {
                const { binIndexX, binIndexY } = findGird(d.x, d.y);
                d3.select(this).remove();
                updateChipDots(xScale, yScale);
                revokeChipDot(xDotData, yDotData, binIndexX, binIndexY);
            })
        // plot the prediction lines
        const predictDotElements = d3.selectAll(".predict-dot").nodes();
        drawPredictionLines(predictDotElements, mainPlot);

        // add interaction to grids
        d3.selectAll(".grids")
            .on("click", function (event) {
                const [clickX, clickY] = d3.pointer(event);

                let clickValueX = xScale.invert(clickX);
                let clickValueY = yScale.invert(clickY);

                const { binIndexX, binIndexY } = findGird(clickValueX, clickValueY);

                // Find the available Grid
                if (binIndexX !== -1 && binIndexY !== -1) {
                    // PREDICT mode
                    if (bivariateMode == "PREDICT") {
                        mainPlot.append("circle")
                            .attr("class", "predict-dot")
                            .attr("cx", clickX)
                            .attr("cy", clickY)
                            .attr("r", dotRadius)
                            .style("fill", "orange")
                            .style("opacity", 0.7)
                            .on('dblclick', function (event) {
                                d3.select(this).remove();
                                updatePredictionDots("minus", mainPlot, xScale, yScale, binIndexX, binIndexY);
                            })

                        updatePredictionDots("add", mainPlot, xScale, yScale, binIndexX, binIndexY);
                    }
                    // CHIP mode
                    else if (bivariateMode == "CHIP") {
                        let xAvailableChip = xDotData
                            .filter(d => d.position === (biVariable1.binEdges[binIndexX] + biVariable1.binEdges[binIndexX + 1]) / 2 && !d.used)
                            .sort((a, b) => a.row - b.row)[0]

                        let yAvailableChip = yDotData
                            .filter(d => d.position === (biVariable2.binEdges[binIndexY] + biVariable2.binEdges[binIndexY + 1]) / 2 && !d.used)
                            .sort((a, b) => a.row - b.row)[0]

                        // Find a Available CHIP
                        if (xAvailableChip && yAvailableChip) {
                            console.log(`move chip to (${clickValueX}, ${clickValueY})`)
                            // set the two available chips as used
                            d3.selectAll(".x-dot")
                                .filter(d => d.position === xAvailableChip.position && d.row === xAvailableChip.row)
                                .style("fill", "gray");
                            d3.selectAll(".y-dot")
                                .filter(d => d.position === yAvailableChip.position && d.row === yAvailableChip.row)
                                .style("fill", "gray");
                            xAvailableChip.used = true;
                            yAvailableChip.used = true;

                            // add the chip on plot
                            mainPlot.append("circle")
                                .attr("class", "chip-dot")
                                .attr("cx", clickX)
                                .attr("cy", clickY)
                                .attr("r", dotRadius)
                                .style("fill", "blue")
                                .style("opacity", 0.7)
                                .on("dblclick", function (event) {
                                    d3.select(this).remove();
                                    updateChipDots(xScale, yScale);
                                    revokeChipDot(xDotData, yDotData, binIndexX, binIndexY);
                                })

                            updateChipDots(xScale, yScale)
                        }
                    }
                }
            })
    }

    const findGird = (x, y) => {
        let binIndexX = -1, binIndexY = -1;

        for (let indexX = 0; indexX < biVariable1.binEdges.length - 1; indexX++) {
            const xEdge1 = biVariable1.binEdges[indexX];
            const xEdge2 = biVariable1.binEdges[indexX + 1];

            // Find the correspond X bin
            if (xEdge1 <= x && x <= xEdge2) {
                for (let indexY = 0; indexY < biVariable2.binEdges.length - 1; indexY++) {
                    const yEdge1 = biVariable2.binEdges[indexY];
                    const yEdge2 = biVariable2.binEdges[indexY + 1];

                    // Find the correspond Y bin
                    if (yEdge1 <= y && y <= yEdge2) {
                        binIndexX = indexX;
                        binIndexY = indexY;
                    }
                }
            }
        }

        console.log("find grid", binIndexX, binIndexY);
        return { binIndexX, binIndexY };
    }

    const updatePredictionDots = (type, mainPlot, xScale, yScale, binIndexX, binIndexY) => {
        let newBivar1Counts = [...biVariable1.counts];
        let newBivar2Counts = [...biVariable2.counts];

        if (type == "add") {
            newBivar1Counts[binIndexX] += 1;
            newBivar2Counts[binIndexY] += 1;
        }
        else if (type == "minus") {
            newBivar1Counts[binIndexX] -= 1;
            newBivar2Counts[binIndexY] -= 1;
        }

        updateVariable(biVariable1.name, "counts", newBivar1Counts);
        updateVariable(biVariable2.name, "counts", newBivar2Counts);

        // Select and sort dots by their 'cx' (x value)
        const predictDotElements = d3.selectAll(".predict-dot").nodes();
        console.log("here", predictDotElements);
        const newPredictionDots = predictDotElements.map((dotElement, idx) => ({
            x: xScale.invert(d3.select(dotElement).attr("cx")),
            y: yScale.invert(d3.select(dotElement).attr("cy"))
        })
        )

        drawPredictionLines(predictDotElements, mainPlot);
        updateBivariable(biVarName, "predictionDots", newPredictionDots);
        console.log("update prediction dots");
    }

    const drawPredictionLines = (predictDotElements, mainPlot) => {
        // Sort the dots by their x value
        const sortedPredictDotElements = predictDotElements.sort((a, b) => d3.select(a).attr("cx") - d3.select(b).attr("cx"));
        // Draw lines connecting the dots after sorting
        d3.selectAll(".predict-line").remove();
        for (let i = 0; i < sortedPredictDotElements.length - 1; i++) {
            const dot1 = d3.select(sortedPredictDotElements[i]);
            const dot2 = d3.select(sortedPredictDotElements[i + 1]);

            mainPlot.append("line")
                .attr("class", "predict-line")
                .attr("x1", dot1.attr("cx"))
                .attr("y1", dot1.attr("cy"))
                .attr("x2", dot2.attr("cx"))
                .attr("y2", dot2.attr("cy"))
                .attr("stroke", "black")
                .attr("stroke-width", 2);
        }

        console.log("draw prediction lines");
    }

    const updateChipDots = (xScale, yScale) => {
        let newChipDots = [];
        d3.selectAll(".chip-dot").nodes().forEach((chipDot) => {
            let chip = d3.select(chipDot);
            newChipDots.push({
                x: xScale.invert(chip.attr("cx")),
                y: yScale.invert(chip.attr("cy"))
            })
        });

        updateBivariable(biVarName, "chipDots", newChipDots);
        console.log("update chip dots");
    }

    const revokeChipDot = (xDotData, yDotData, binIndexX, binIndexY) => {
        let revokeXDot = xDotData
            .filter(d => d.position === (biVariable1.binEdges[binIndexX] + biVariable1.binEdges[binIndexX + 1]) / 2 && d.used)
            .sort((a, b) => b.row - a.row)[0];

        let revokeYDot = yDotData
            .filter(d => d.position === (biVariable2.binEdges[binIndexY] + biVariable2.binEdges[binIndexY + 1]) / 2 && d.used)
            .sort((a, b) => b.row - a.row)[0];

        d3.selectAll(".x-dot")
            .filter(d => d.position === revokeXDot.position && d.row === revokeXDot.row)
            .style("fill", "white");

        d3.selectAll(".y-dot")
            .filter(d => d.position === revokeYDot.position && d.row === revokeYDot.row)
            .style("fill", "white");

        revokeXDot.used = false;
        revokeYDot.used = false;

        console.log("revoke chip dot");
    }

    const changeBivariateMode = (mode) => {
        console.log("change mode", mode);
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