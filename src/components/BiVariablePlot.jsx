import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Button, Grid2 } from '@mui/material';
import { logUserBehavior } from '../utils/BehaviorListener';

export default function BiVariablePlot({ biVariableDict, biVariable1, biVariable2, updateVariable, updateBivariable }) {
    const chartWidth = 800;
    const chartHeight = 800;
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    const marginalPlotWidth = 100; // y-axis marginal hist
    const marginalPlotHeight = 100; // x-axis marginal hist
    const mainPlotWidth = chartWidth - margin.left - margin.right - marginalPlotWidth;
    const mainPlotHeight = chartHeight - margin.top - margin.bottom - marginalPlotHeight;
    const dotRadius = 5; // Radius of each dot
    const toggleHeight = 7;
    const labelOffset = 12;
    const titleOffset = 40;

    const MODES = { "PREDICT": 0, "POPULATE": 1, "CHIP": 2 };
    const COLORS = { "PREDICT_DOT": "orange", "POPULATE_DOT": "blue", "CHIP_DOT": "blue" }
    const [bivariateMode, setBivariateMode] = useState('PREDICT');

    useEffect(() => {
        drawPlot();
        drawGridPlot();
    }, [biVariable1.name, biVariable2.name])

    useEffect(() => {
        drawGridPlot();
        drawMarginPlot();
    }, [biVariable1.counts, biVariable2.counts, bivariateMode])

    const drawPlot = () => {
        document.getElementById("bivariate-distribution-div").innerHTML = "";

        let svg = d3.select("#bivariate-distribution-div").append("svg")
            .attr("id", "bivariate-svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight);
        svg.append("g")
            .attr("id", "bivariate-main-plot")
            .attr("transform", `translate(${margin.left}, ${margin.top + marginalPlotHeight})`)
    }

    const drawGridPlot = () => {
        document.getElementById("bivariate-main-plot").innerHTML = "";
        let mainPlot = d3.select("#bivariate-main-plot")
        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

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

        // X axis title
        mainPlot.append("text")
            .attr("text-anchor", "middle")
            .attr("x", mainPlotWidth / 2)
            .attr("y", mainPlotHeight + titleOffset)
            .style("font-size", "16px")
            .text(biVariable1.name);

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

        // Y axis title
        mainPlot.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -mainPlotHeight / 2)
            .attr("y", -titleOffset)
            .style("font-size", "16px")
            .text(biVariable2.name);

        mainPlot.selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");

        // create interactive grid cells
        for (let i = 0; i < biVariable1.binEdges.length - 1; i++) {
            const curGridX = xScale(biVariable1.binEdges[i]);
            const nextGridX = xScale(biVariable1.binEdges[i + 1]);
            for (let j = 0; j < biVariable2.binEdges.length - 1; j++) {
                const curGridY = yScale(biVariable2.binEdges[j]);
                const nextGridY = yScale(biVariable2.binEdges[j + 1]);

                mainPlot.append("rect")
                    .attr("class", "grids")
                    .attr("id", `grid-${i}-${j}`)
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
        const biVarName = biVariable1.name + "-" + biVariable2.name;

        d3.select("#margin-x-plot").remove();
        d3.select("#margin-y-plot").remove();

        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);

        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        console.log("bi var", biVariableDict[biVarName])
        let predictionDots = biVariableDict[biVarName].predictionDots;
        let populateDots = biVariableDict[biVarName].populateDots;
        let chipDots = biVariableDict[biVarName].chipDots;

        // create marginal dot plot (top) - variable 1
        let maxMarginDotX = d3.max(biVariable1.counts) < 8 ? 10 : d3.max(biVariable1.counts) + 2;
        let maxMarginDotY = d3.max(biVariable2.counts) < 8 ? 10 : d3.max(biVariable2.counts) + 2;

        let xDotData = [];
        let xHistData = [];
        biVariable1.counts.forEach((count, index) => {
            const x0 = biVariable1.binEdges[index];
            const x1 = biVariable1.binEdges[index + 1];
            const binCenter = (x0 + x1) / 2;
            let usedDotsCnt = predictionDots.filter(d => x0 <= d.x && d.x <= x1).length + populateDots.filter(d => x0 <= d.x && d.x <= x1).length + chipDots.filter(d => x0 <= d.x && d.x <= x1).length;

            // Add dots for each count, each dot will be placed in the bin
            for (let i = 0; i < count; i++) {
                xDotData.push({
                    position: binCenter,
                    row: i,
                    used: i < usedDotsCnt ? true : false
                });
            }

            xHistData.push({
                posStart: x0,
                posEnd: x1,
                height: count
            })
        });

        // create marginal dot plot (right) - variable 2
        let yDotData = [];
        let yHistData = [];
        biVariable2.counts.forEach((count, index) => {
            const y0 = biVariable2.binEdges[index];
            const y1 = biVariable2.binEdges[index + 1];
            const binCenter = (y0 + y1) / 2;
            let usedDotsCnt = predictionDots.filter(d => y0 <= d.y && d.y <= y1).length + populateDots.filter(d => y0 <= d.y && d.y <= y1).length + chipDots.filter(d => y0 <= d.y && d.y <= y1).length;

            // Add dots for each count, each dot will be placed in the bin
            for (let i = 0; i < count; i++) {
                yDotData.push({
                    position: binCenter,
                    row: i,
                    used: i < usedDotsCnt ? true : false
                });
            }

            yHistData.push({
                posStart: y0,
                posEnd: y1,
                height: count
            })
        });

        // Define the scale to control how the dots stack horizontally
        const marginDotYScale = d3.scaleLinear()
            .domain([0, maxMarginDotY])
            .range([0, marginalPlotWidth]); // Dots will stack leftwards
        // Define the scale to control how the dots stack vertically
        const marginDotXScale = d3.scaleLinear()
            .domain([0, maxMarginDotX])
            .range([marginalPlotHeight, 0]); // Dots will stack upwards
        // Draw marginal x-axis dot plot
        let marginalXPlot = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`)
            .attr("id", "margin-x-plot");
        // Append Marginal X Histogram
        let marginHistX = marginalXPlot
            .selectAll("rect")
            .data(xHistData)
            .enter()
            .append("rect")
            .attr("class", "x-margin-rect")
            .attr('x', d => xScale(d.posStart))
            .attr('y', d => marginDotXScale(d.height))
            .attr('width', d => xScale(d.posEnd) - xScale(d.posStart))
            .attr('height', d => marginalPlotHeight - marginDotXScale(d.height))
            .style('fill', 'lightblue')  // Light color for preview
            .style('stroke', 'black');
        // Add labels on top of bars
        let marginXlabels = marginalXPlot.selectAll('text.label')
            .data(xHistData)
            .enter()
            .append('text')
            .attr('class', 'x-margin-label')
            .attr('x', d => (xScale(d.posEnd) + xScale(d.posStart)) / 2)
            .attr('y', d => marginDotXScale(d.height) - labelOffset)
            .attr('text-anchor', 'middle')
            .text(d => d.height)
            .style('font-size', 12)
            .style('font-family', 'Times New Roman')
            .style('fill', 'black');

        let dragBehaviorX =
            d3.drag()
                .on('drag', function (event) {
                    // Find the index of the current circle (toggle) being dragged
                    const index = d3.select(this).datum();
                    // Convert y-coordinate to bin height (rounded to nearest integer)
                    let newHeight = Math.round(marginDotXScale.invert(event.y));
                    // Ensure newHeight is constrained to valid values
                    newHeight = Math.max(0, Math.min(newHeight, maxMarginDotX));
                    // Update the bar height for live preview
                    d3.select(marginHistX.nodes()[index])
                        .attr('y', marginDotXScale(newHeight))
                        .attr('height', marginalPlotHeight - marginDotXScale(newHeight));

                    // Update the label position and value
                    d3.select(marginXlabels.nodes()[index])
                        .attr('y', marginDotXScale(newHeight) - labelOffset)
                        .text(newHeight);

                    // Update the position of the toggle circle
                    d3.select(this)
                        .attr('y', marginDotXScale(newHeight) - toggleHeight);
                })
                .on('end', function (event) {
                    // Find the index of the current circle (toggle) being dragged
                    const index = d3.select(this).datum();

                    // Convert y-coordinate to bin height (rounded to nearest integer)
                    let newHeight = Math.round(marginDotXScale.invert(event.y));
                    newHeight = Math.max(0, Math.min(newHeight, maxMarginDotX));

                    // Update counts array
                    let newCounts = [...biVariable1.counts];
                    logUserBehavior(`bi-plot(${biVarName})-margin-x`, "drag", `adjust distribution at bin-${index}`, `${newCounts[index]} -> ${newHeight}`)
                    newCounts[index] = newHeight;

                    // Set the actual counts
                    updateVariable(biVariable1.name, "counts", newCounts);
                })

        // Append Marginal X Toggle
        marginalXPlot.selectAll('rect.toggle')
            .data(d3.range(xHistData.length))  // Use the index range as data
            .enter()
            .append('rect')
            .attr('class', 'x-margin-rect-toggle')
            .attr('x', d => xScale(xHistData[d].posStart))
            .attr('y', d => marginDotXScale(xHistData[d].height) - toggleHeight)
            .attr('width', d => xScale(xHistData[d].posEnd) - xScale(xHistData[d].posStart))
            .attr('height', toggleHeight)
            .attr('rx', 5)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', '1px')
            .call(dragBehaviorX);
        // Append Marginal X Dots
        marginalXPlot
            .selectAll("circle")
            .data(xDotData)
            .enter()
            .append("circle")
            .attr("class", "x-margin-dot")
            .attr("cx", d => xScale(d.position)) // Place dot at the bin's center on the x-axis
            .attr("cy", d => marginDotXScale(d.row) - dotRadius) // Stack dots by their row value
            .attr("r", dotRadius) // Set radius of the dot
            .style("fill", d => d.used ? "gray" : "white")
            .style("stroke", "black")
            .style("stroke-width", "1px")

        // Draw marginal y-axis plot
        let marginalYPlot = svg.append("g")
            .attr("transform", `translate(${margin.left + mainPlotWidth}, ${margin.top + marginalPlotHeight})`)
            .attr("id", "margin-y-plot");
        // Append Marginal Y Histogram
        let marginHistY = marginalYPlot
            .selectAll("rect")
            .data(yHistData)
            .enter()
            .append("rect")
            .attr("class", "y-margin-rect")
            .attr('x', d => 0)
            .attr('y', d => yScale(d.posEnd))
            .attr('width', d => marginDotYScale(d.height))
            .attr('height', d => yScale(d.posStart) - yScale(d.posEnd))
            .style('fill', 'lightblue')  // Light color for preview
            .style('stroke', 'black');
        // Add Marginal Y labels
        let marginYlabels = marginalYPlot.selectAll('text.label')
            .data(yHistData)
            .enter()
            .append('text')
            .attr('class', 'y-margin-label')
            .attr('x', d => marginDotYScale(d.height) + labelOffset)
            .attr('y', d => (yScale(d.posEnd) + yScale(d.posStart)) / 2)
            .attr('text-anchor', 'middle')
            .text(d => d.height)
            .style('font-size', 12)
            .style('font-family', 'Times New Roman')
            .style('fill', 'black');

        let dragBehaviorY = d3.drag()
            .on('drag', function (event) {
                // Find the index of the current circle (toggle) being dragged
                const index = d3.select(this).datum();
                // Convert y-coordinate to bin height (rounded to nearest integer)
                let newWidth = Math.round(marginDotYScale.invert(event.x));
                // Ensure newHeight is constrained to valid values
                newWidth = Math.max(0, Math.min(newWidth, maxMarginDotY));
                d3.select(marginHistY.nodes()[index])
                    .attr('width', marginDotYScale(newWidth));

                // Update the label position and value
                d3.select(marginYlabels.nodes()[index])
                    .attr('x', marginDotYScale(newWidth) + labelOffset)
                    .text(newWidth);

                d3.select(this)
                    .attr('x', marginDotYScale(newWidth));
            })
            .on('end', function (event) {
                // Find the index of the current circle (toggle) being dragged
                const index = d3.select(this).datum();

                // Convert y-coordinate to bin height (rounded to nearest integer)
                let newWidth = Math.round(marginDotYScale.invert(event.x));
                newWidth = Math.max(0, Math.min(newWidth, maxMarginDotY));

                // Update counts array
                let newCounts = [...biVariable2.counts];
                logUserBehavior(`bi-plot(${biVarName})-margin-y`, "drag", `adjust distribution at bin-${index}`, `${newCounts[index]} -> ${newWidth}`)
                newCounts[index] = newWidth;

                // Set the actual counts
                updateVariable(biVariable2.name, "counts", newCounts);
            })

        // Append Marginal Y Toggle
        marginalYPlot.selectAll('rect.toggle')
            .data(d3.range(yHistData.length))  // Use the index range as data
            .enter()
            .append('rect')
            .attr('class', 'y-margin-rect-toggle')
            .attr('x', d => marginDotYScale(yHistData[d].height))
            .attr('y', d => yScale(yHistData[d].posEnd))
            .attr('width', toggleHeight)
            .attr('height', d => yScale(yHistData[d].posStart) - yScale(yHistData[d].posEnd))
            .attr('rx', 5)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', '1px')
            .call(dragBehaviorY);
        // Append Marginal Y Dots
        marginalYPlot
            .selectAll("circle")
            .data(yDotData)
            .enter()
            .append("circle")
            .attr("class", "y-margin-dot")
            .attr("cx", d => dotRadius + marginDotYScale(d.row)) // Stack dots by their row value (horizontally)
            .attr("cy", d => yScale(d.position)) // Place dot at the bin's center on the y-axis
            .attr("r", dotRadius) // Set radius of the dot
            .style("fill", d => d.used ? "gray" : "white")
            .style("stroke", "black")
            .style("stroke-width", "1px")

        // plot the prediction dots
        mainPlot.selectAll(".predict-dot")
            .data(predictionDots)
            .enter()
            .append("circle")
            .attr("class", "predict-dot")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", dotRadius)
            .attr("fill", COLORS.PREDICT_DOT)
            .style("opacity", 0.7)
            .on('dblclick', function (event, d) {
                const { binIndexX, binIndexY } = findGird(d.x, d.y);
                d3.select(this).remove();
                logUserBehavior(`bi-plot(${biVarName})`, "double click", "remove a predict dot", `(${xScale.invert(d.x)}, ${yScale.invert(d.y)})`);
                updatePredictionDots("minus", mainPlot, xScale, yScale, binIndexX, binIndexY);
            })
        // plot the populate dots
        mainPlot.selectAll(".populate-dot")
            .data(populateDots)
            .enter()
            .append("circle")
            .attr("class", "populate-dot")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", dotRadius)
            .attr("fill", COLORS.POPULATE_DOT)
            .style("opacity", 0.7)
            .on('dblclick', function (event, d) {
                const { binIndexX, binIndexY } = findGird(d.x, d.y);
                d3.select(this).remove();
                logUserBehavior(`bi-plot(${biVarName})`, "double click", "remove a populate dot", `(${xScale.invert(d.x)}, ${yScale.invert(d.y)})`);
                updatePopulateDots("minus", xScale, yScale, binIndexX, binIndexY);
            })
        // plot the chip dots
        mainPlot.selectAll(".chip-dot")
            .data(chipDots)
            .enter()
            .append("circle")
            .attr("class", "chip-dot")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", dotRadius)
            .attr("fill", COLORS.CHIP_DOT)
            .style("opacity", 0.7)
            .on('dblclick', function (event, d) {
                const { binIndexX, binIndexY } = findGird(d.x, d.y);
                d3.select(this).remove();
                logUserBehavior(`bi-plot(${biVarName})`, "double click", "remove a chip dot", `(${xScale.invert(d.x)}, ${yScale.invert(d.y)})`);
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
                    if (bivariateMode === MODES.PREDICT) {
                        mainPlot.append("circle")
                            .attr("class", "predict-dot")
                            .attr("cx", clickX)
                            .attr("cy", clickY)
                            .attr("r", dotRadius)
                            .style("fill", COLORS.PREDICT_DOT)
                            .style("opacity", 0.7)

                        logUserBehavior(`bi-plot(${biVarName})`, "click", "add a predict dot", `(${clickValueX}, ${clickValueY})`);
                        updatePredictionDots("add", mainPlot, xScale, yScale, binIndexX, binIndexY);
                    }
                    else if (bivariateMode === MODES.POPULATE) {
                        mainPlot.append("circle")
                            .attr("class", "populate-dot")
                            .attr("cx", clickX)
                            .attr("cy", clickY)
                            .attr("r", dotRadius)
                            .style("fill", COLORS.POPULATE_DOT)
                            .style("opacity", 0.7)

                        logUserBehavior(`bi-plot(${biVarName})`, "click", "add a populate dot", `(${clickValueX}, ${clickValueY})`);
                        updatePopulateDots("add", xScale, yScale, binIndexX, binIndexY);
                    }
                    // CHIP mode
                    else if (bivariateMode === MODES.CHIP) {
                        let xAvailableChip = xDotData
                            .filter(d => d.position === (biVariable1.binEdges[binIndexX] + biVariable1.binEdges[binIndexX + 1]) / 2 && !d.used)
                            .sort((a, b) => a.row - b.row)[0]

                        let yAvailableChip = yDotData
                            .filter(d => d.position === (biVariable2.binEdges[binIndexY] + biVariable2.binEdges[binIndexY + 1]) / 2 && !d.used)
                            .sort((a, b) => a.row - b.row)[0]

                        // Find a Available CHIP
                        if (xAvailableChip && yAvailableChip) {
                            d3.select(`#grid-${binIndexX}-${binIndexY}`)
                                .attr('fill', 'lightgreen')  // Change the color to red
                                .transition()  // Transition back after 1 second
                                .delay(500)
                                .attr('fill', 'transparent');

                            // set the two available chips as used
                            d3.selectAll(".x-margin-dot")
                                .filter(d => d.position === xAvailableChip.position && d.row === xAvailableChip.row)
                                .style("fill", "gray");
                            d3.selectAll(".y-margin-dot")
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
                                .style("fill", COLORS.CHIP_DOT)
                                .style("opacity", 0.7)
                                .on("dblclick", function (event) {
                                    d3.select(this).remove();
                                    updateChipDots(xScale, yScale);
                                    revokeChipDot(xDotData, yDotData, binIndexX, binIndexY);
                                })

                            logUserBehavior(`bi-plot(${biVarName})`, "click", "add a chip dot", `(${clickValueX}, ${clickValueY})`);
                            updateChipDots(xScale, yScale)
                        }
                        else {
                            d3.select(`#grid-${binIndexX}-${binIndexY}`)
                                .attr('fill', 'lightcoral')  // Change the color to red
                                .transition()  // Transition back after 1 second
                                .delay(500)
                                .attr('fill', 'transparent');

                            logUserBehavior(`bi-plot(${biVarName})`, "click", "fail to add a chip dot", `(${clickValueX}, ${clickValueY})`);
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

        return { binIndexX, binIndexY };
    }

    const updatePredictionDots = (type, mainPlot, xScale, yScale, binIndexX, binIndexY) => {
        let newBivar1Counts = [...biVariable1.counts];
        let newBivar2Counts = [...biVariable2.counts];

        if (type === "add") {
            newBivar1Counts[binIndexX] += 1;
            newBivar2Counts[binIndexY] += 1;
        }
        else if (type === "minus") {
            newBivar1Counts[binIndexX] -= 1;
            newBivar2Counts[binIndexY] -= 1;
        }

        // Select and sort dots by their 'cx' (x value)
        const predictDotElements = d3.selectAll(".predict-dot").nodes();
        let newPredictionDots = predictDotElements.map((dotElement, idx) => ({
            x: xScale.invert(d3.select(dotElement).attr("cx")),
            y: yScale.invert(d3.select(dotElement).attr("cy"))
        })
        )

        drawPredictionLines(predictDotElements, mainPlot);
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        updateBivariable(biVarName, "predictionDots", newPredictionDots);
        updateVariable(biVariable1.name, "counts", newBivar1Counts);
        updateVariable(biVariable2.name, "counts", newBivar2Counts);
    }

    const updatePopulateDots = (type, xScale, yScale, binIndexX, binIndexY) => {
        let newBivar1Counts = [...biVariable1.counts];
        let newBivar2Counts = [...biVariable2.counts];

        if (type === "add") {
            newBivar1Counts[binIndexX] += 1;
            newBivar2Counts[binIndexY] += 1;
        }
        else if (type === "minus") {
            newBivar1Counts[binIndexX] -= 1;
            newBivar2Counts[binIndexY] -= 1;
        }

        // Select and sort dots by their 'cx' (x value)
        const populateDotElements = d3.selectAll(".populate-dot").nodes();
        let newPopulateDots = populateDotElements.map((dotElement, idx) => ({
            x: xScale.invert(d3.select(dotElement).attr("cx")),
            y: yScale.invert(d3.select(dotElement).attr("cy"))
        })
        )
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        updateBivariable(biVarName, "populateDots", newPopulateDots);
        updateVariable(biVariable1.name, "counts", newBivar1Counts);
        updateVariable(biVariable2.name, "counts", newBivar2Counts);
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

        const biVarName = biVariable1.name + "-" + biVariable2.name;
        updateBivariable(biVarName, "chipDots", newChipDots);
    }

    const revokeChipDot = (xDotData, yDotData, binIndexX, binIndexY) => {
        let revokeXDot = xDotData
            .filter(d => d.position === (biVariable1.binEdges[binIndexX] + biVariable1.binEdges[binIndexX + 1]) / 2 && d.used)
            .sort((a, b) => b.row - a.row)[0];

        let revokeYDot = yDotData
            .filter(d => d.position === (biVariable2.binEdges[binIndexY] + biVariable2.binEdges[binIndexY + 1]) / 2 && d.used)
            .sort((a, b) => b.row - a.row)[0];

        d3.selectAll(".x-margin-dot")
            .filter(d => d.position === revokeXDot.position && d.row === revokeXDot.row)
            .style("fill", "white");

        d3.selectAll(".y-margin-dot")
            .filter(d => d.position === revokeYDot.position && d.row === revokeYDot.row)
            .style("fill", "white");

        revokeXDot.used = false;
        revokeYDot.used = false;
    }

    const changeBivariateMode = (mode) => {
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        logUserBehavior(`bi-plot(${biVarName})`, "click button", "change mode", `${bivariateMode} -> ${mode}`);
        setBivariateMode(mode);
    }

    return (
        <div>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyItems: "center" }}>
                <Button variant={bivariateMode === MODES.PREDICT ? "contained" : "outlined"} onClick={() => changeBivariateMode(MODES.PREDICT)}>PREDICT</Button>
                <Button sx={{ mx: 1 }} variant={bivariateMode === MODES.POPULATE ? "contained" : "outlined"} onClick={() => changeBivariateMode(MODES.POPULATE)}>POPULATE</Button>
                <Button sx={{ mx: 1 }} variant={bivariateMode === MODES.CHIP ? "contained" : "outlined"} onClick={() => changeBivariateMode(MODES.CHIP)}>CHIP</Button>
            </Box>
            <div id='bivariate-distribution-div'></div>
        </div>
    )
}