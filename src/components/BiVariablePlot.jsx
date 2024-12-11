import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Button, Grid2 } from '@mui/material';
import { logUserBehavior } from '../utils/BehaviorListener';
import axios from "axios";

const BiVariablePlot = React.forwardRef(({ biVariableDict, biVariable1, biVariable2, updateVariable, updateBivariable, entities }, ref) => {
    const chartWidth = 800;
    const chartHeight = 800;
    const margin = { top: 30, right: 30, bottom: 80, left: 80 };
    const marginalPlotWidth = 80; // y-axis marginal hist
    const marginalPlotHeight = 80; // x-axis marginal hist
    const mainPlotWidth = chartWidth - margin.left - margin.right - marginalPlotWidth;
    const mainPlotHeight = chartHeight - margin.top - margin.bottom - marginalPlotHeight;
    const dotRadius = 5; // Radius of each dot
    const marginDotRadius = 4;
    const toggleHeight = 7;
    const labelOffset = 12;
    const titleOffset = 40;

    const MODES = { "PREDICT": 0, "POPULATE": 1, "CHIP": 2, "COMBINE": 3 };
    const COLORS = { "PREDICT_DOT": "orange", "POPULATE_DOT": "blue", "CHIP_DOT": "blue" }
    const [bivariateMode, setBivariateMode] = useState('PREDICT');
    const [selectedDots, setSelectedDots] = useState([]);
    const [enableBrush, setEnableBrush] = useState(false);

    useEffect(() => {
        drawPlot();
        drawGridPlot();
    }, [biVariable1.name, biVariable2.name])

    useEffect(() => {
        drawGridPlot();
        drawMarginPlot();
    }, [biVariable1.counts, biVariable2.counts, bivariateMode])

    useEffect(() => {
        populateEntities();
    }, [entities])

    const populateEntities = () => {
        let mainPlot = d3.select("#bivariate-main-plot");
        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        console.log("populate entities", entities);

        mainPlot.selectAll(".entity-dot").remove();
        entities?.forEach(entity => {
            mainPlot.append("circle")
                .datum(entity)
                .attr("class", "entity-dot")
                .attr("cx", d => xScale(d[biVariable1.name]))
                .attr("cy", d => yScale(d[biVariable2.name]))
                .attr("r", dotRadius)
                .attr("fill", "white")
                .style("stroke-width", 1.5)
                .attr("stroke", "steelblue")
        });
    }

    React.useImperativeHandle(ref, () => ({
        synchronizeSelection,
    }));

    const synchronizeSelection = (selectedEntities) => {
        let mainPlot = d3.select("#bivariate-main-plot");

        mainPlot.selectAll(".entity-dot")
            .style("fill", d => selectedEntities.includes(d) ? "steelblue" : "white")
            .style("opacity", d => selectedEntities.includes(d) ? 1 : 0.3);
    }

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
            .text(`${biVariable1.name} (${biVariable1.unitLabel})`);

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
            .text(`${biVariable2.name} (${biVariable2.unitLabel})`);

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

        populateEntities();
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
            .attr("cy", d => marginDotXScale(d.row) - marginDotRadius) // Stack dots by their row value
            .attr("r", marginDotRadius) // Set radius of the dot
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
            .attr("cx", d => marginDotRadius + marginDotYScale(d.row)) // Stack dots by their row value (horizontally)
            .attr("cy", d => yScale(d.position)) // Place dot at the bin's center on the y-axis
            .attr("r", marginDotRadius) // Set radius of the dot
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
            .attr("fill", "white")
            .style("stroke-width", 1.5)
            .attr("stroke", COLORS.PREDICT_DOT)
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
            .attr("fill", "white")
            .style("stroke-width", 1.5)
            .attr("stroke", COLORS.POPULATE_DOT)
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
            .attr("fill", "white")
            .style("stroke-width", 1.5)
            .attr("stroke", COLORS.CHIP_DOT)
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
                            .attr("fill", "white")
                            .style("stroke-width", 1.5)
                            .style("stroke", COLORS.PREDICT_DOT)

                        logUserBehavior(`bi-plot(${biVarName})`, "click", "add a predict dot", `(${clickValueX}, ${clickValueY})`);
                        updatePredictionDots("add", mainPlot, xScale, yScale, binIndexX, binIndexY);
                    }
                    // POPULATE mode
                    else if (bivariateMode === MODES.POPULATE) {
                        mainPlot.append("circle")
                            .attr("class", "populate-dot")
                            .attr("cx", clickX)
                            .attr("cy", clickY)
                            .attr("r", dotRadius)
                            .attr("fill", "white")
                            .style("stroke-width", 1.5)
                            .style("stroke", COLORS.POPULATE_DOT)

                        logUserBehavior(`bi-plot(${biVarName})`, "click", "add a populate dot", `(${clickValueX}, ${clickValueY})`);
                        updatePopulateDots("add", xScale, yScale, binIndexX, binIndexY);
                    }
                    // Combine CHIP and POPULATE mode
                    else if (bivariateMode === MODES.COMBINE) {
                        // check if there are available dots in the margin
                        let xAvailableDot = xDotData
                            .filter(d => d.position === (biVariable1.binEdges[binIndexX] + biVariable1.binEdges[binIndexX + 1]) / 2 && !d.used)
                            .sort((a, b) => a.row - b.row)[0]
                        let yAvailableDot = yDotData
                            .filter(d => d.position === (biVariable2.binEdges[binIndexY] + biVariable2.binEdges[binIndexY + 1]) / 2 && !d.used)
                            .sort((a, b) => a.row - b.row)[0]

                        // occupy the available dots
                        let operationX = "add", operationY = "add";
                        if (xAvailableDot) {
                            d3.selectAll(".x-margin-dot")
                                .filter(d => d.position === xAvailableDot.position && d.row === xAvailableDot.row)
                                .style("fill", "gray");
                            xAvailableDot.used = true;
                            operationX = "none";
                        }
                        if (yAvailableDot) {
                            d3.selectAll(".y-margin-dot")
                                .filter(d => d.position === yAvailableDot.position && d.row === yAvailableDot.row)
                                .style("fill", "gray");
                            yAvailableDot.used = true;
                            operationY = "none";
                        }

                        // add the data point
                        mainPlot.append("circle")
                            .attr("class", "populate-dot")
                            .attr("cx", clickX)
                            .attr("cy", clickY)
                            .attr("r", dotRadius)
                            .attr("fill", "white")
                            .style("stroke-width", 1.5)
                            .style("stroke", COLORS.POPULATE_DOT)

                        logUserBehavior(`bi-plot(${biVarName})`, "click", "add a combine dot", `${operationX}(${clickValueX}), ${operationY}(${clickValueY})`);
                        console.log("x: ", operationX, "y: ", operationY)
                        updateCombineDots(operationX, operationY, xScale, yScale, binIndexX, binIndexY);
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
                                .attr("fill", "white")
                                .attr("stroke-width", 1.5)
                                .style("stroke", COLORS.CHIP_DOT)
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

        if (biVariableDict[biVarName].fittedRelation?.fittedLine) {
            drawFittedRelation(biVariableDict[biVarName].fittedRelation.fittedLine);
        }
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
                .attr("stroke", "gray")
                .attr("stroke-dasharray", "5,5")
                .attr("stroke-width", 2);
        }
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

    const updateCombineDots = (operationX, operationY, xScale, yScale, binIndexX, binIndexY) => {
        let newBivar1Counts = [...biVariable1.counts];
        let newBivar2Counts = [...biVariable2.counts];

        // add x, add y, minus x, minus y
        if (operationX === "add") {
            newBivar1Counts[binIndexX] += 1;
        }
        else if (operationX === "minus") {
            newBivar1Counts[binIndexX] -= 1;
        }

        if (operationY === "add") {
            newBivar2Counts[binIndexY] += 1;
        }
        else if (operationY === "minus") {
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

    // Use Populate Dot and Chip Dot to do Regression
    const fitRelation = () => {
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        axios
            .post(window.BACKEND_ADDRESS + "/fitBiVarRelation", {
                populateDots: biVariableDict[biVarName].populateDots,
                chipDots: biVariableDict[biVarName].chipDots
            })
            .then((resp) => {
                updateBivariable(biVarName, "fittedRelation", resp.data);
                updateBivariable(biVarName, "specified", true);
                drawFittedRelation(resp.data.fittedLine);
                logUserBehavior(`bi-plot(${biVarName})`, "click", `fit bvariate relationship`, `${resp.data.equation}`)
            })
    }

    const drawFittedRelation = (fittedLine) => {
        let mainPlot = d3.select("#bivariate-main-plot");
        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        d3.select("#bivariate-plot-relation")?.remove()
        let g = mainPlot.append("g")
            .attr("id", "bivariate-plot-relation");

        // Line for the Regression Fit
        const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y));

        g.append("path")
            .datum(fittedLine)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    const clearAll = () => {
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        logUserBehavior(`bi-plot(${biVarName})`, "click button", "clear all", "");
        d3.selectAll(".predict-dot").remove();
        d3.selectAll(".populate-dot").remove();
        d3.selectAll(".chip-dot").remove();
        d3.selectAll(".predict-line").remove();
        // d3.selectAll(".grids").attr("fill", "transparent");

        updateBivariable(biVarName, "predictionDots", []);
        updateBivariable(biVarName, "populateDots", []);
        updateBivariable(biVarName, "chipDots", []);
        updateBivariable(biVarName, "fittedRelation", {});
        // updateBivariable(biVarName, "specified", false);
    }

    const addContextMenu = () => {
        const mainPlot = d3.select("#bivariate-main-plot");

        mainPlot.on("contextmenu", function (event) {
            event.preventDefault();
            const [mouseX, mouseY] = d3.pointer(event);

            d3.select("#context-menu").remove();

            const contextMenu = mainPlot.append("g")
                .attr("id", "context-menu")
                .attr("transform", `translate(${mouseX}, ${mouseY})`);

            contextMenu.append("rect")
                .attr("width", 100)
                .attr("height", 50)
                .attr("fill", "white")
                .attr("stroke", "black");

            contextMenu.append("text")
                .attr("x", 10)
                .attr("y", 20)
                .text("Clear Region")
                .style("cursor", "pointer")
                .on("click", () => {
                    clearRegional();
                    contextMenu.remove();
                });

            contextMenu.append("text")
                .attr("x", 10)
                .attr("y", 40)
                .text("Cancel")
                .style("cursor", "pointer")
                .on("click", () => {
                    contextMenu.remove();
                });
        });

        d3.select("body").on("click", () => {
            d3.select("#context-menu").remove();
        });
    };

    useEffect(() => {
        addContextMenu();
    }, []);

    const activeRegionalBrush = () => {
        // Define the brush behavior
        const brush = d3.brush()
            .extent([[0, 0], [mainPlotWidth, mainPlotHeight]])
            .on("start brush end", brushed);
        const mainPlot = d3.select("#bivariate-main-plot");

        function brushed(event) {
            let selectedDots = [];
            const selection = event.selection;
            let xScale = d3.scaleLinear()
                .domain([biVariable1.min, biVariable1.max])
                .range([0, mainPlotWidth]);
            let yScale = d3.scaleLinear()
                .domain([biVariable2.min, biVariable2.max])
                .range([mainPlotHeight, 0]);

            let dots = mainPlot.selectAll(".populate-dot, .chip-dot");
            console.log("dots", dots);
            if (selection) {
                const [[x0, y0], [x1, y1]] = selection;
                selectedDots = dots
                    .filter(d => {
                        console.log("dot data", d);
                        const cx = xScale(d.x);
                        const cy = yScale(d.y);
                        return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
                    })
                    .style("stroke", "red")
                    .data();
                setSelectedDots(selectedDots);

                mainPlot.on("contextmenu", function (event) {
                    event.preventDefault();
                    const [mouseX, mouseY] = d3.pointer(event);

                    // Remove any existing context menu
                    d3.select("#context-menu").remove();

                    // Create a new context menu
                    const contextMenu = mainPlot.append("div")
                        .attr("id", "context-menu")
                        .style("position", "absolute")
                        .style("left", `${mouseX}px`)
                        .style("top", `${mouseY}px`)
                        .style("background", "white")
                        .style("border", "1px solid black")
                        .style("padding", "10px")
                        .style("z-index", 1000);

                    contextMenu.append("div")
                        .text("Option 1")
                        .on("click", () => {
                            console.log("Option 1 clicked");
                            // Handle Option 1 click
                            contextMenu.remove();
                        });

                    contextMenu.append("div")
                        .text("Option 2")
                        .on("click", () => {
                            console.log("Option 2 clicked");
                            // Handle Option 2 click
                            contextMenu.remove();
                        });

                    // Remove context menu on click outside
                    d3.select("body").on("click.context-menu", () => {
                        contextMenu.remove();
                        d3.select("body").on("click.context-menu", null);
                    });
                });
            }
            else {
                dots.style("stroke", "blue")
                mainPlot.on("contextmenu", null); // Remove context menu event listener
            }
        }

        if (enableBrush) {
            mainPlot.selectAll(".brush").remove();
            setEnableBrush(false);
        }
        else {
            mainPlot.append("g")
                .attr("class", "brush")
                .call(brush);
            setEnableBrush(true);
        }
    }

    const clearRegional = () => {
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        logUserBehavior(`bi-plot(${biVarName})`, "click button", "clear regional", "");
        console.log(selectedDots);
        selectedDots.forEach(dot => {
            d3.selectAll(`.populate-dot, .chip-dot`)
                .filter(d => d.x === dot.x && d.y === dot.y)
                .remove();
        });

        const newPopulateDots = biVariableDict[biVarName].populateDots.filter(dot => !selectedDots.some(sel => sel.x === dot.x && sel.y === dot.y));
        const newChipDots = biVariableDict[biVarName].chipDots.filter(dot => !selectedDots.some(sel => sel.x === dot.x && sel.y === dot.y));

        let newBivar1Counts = [...biVariable1.counts];
        let newBivar2Counts = [...biVariable2.counts];
        selectedDots.forEach(dot => {
            const { binIndexX, binIndexY } = findGird(dot.x, dot.y);
            newBivar1Counts[binIndexX] -= 1;
            newBivar2Counts[binIndexY] -= 1;
        });
        updateVariable(biVariable1.name, "counts", newBivar1Counts);
        updateVariable(biVariable2.name, "counts", newBivar2Counts);

        updateBivariable(biVarName, "populateDots", newPopulateDots);
        updateBivariable(biVarName, "chipDots", newChipDots);
        setSelectedDots([]);
    }


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                {/* <Button sx={{ m: 1 }} variant={bivariateMode === MODES.PREDICT ? "contained" : "outlined"} onClick={() => changeBivariateMode(MODES.PREDICT)}>Trend</Button>
                <Button sx={{ m: 1 }} variant={bivariateMode === MODES.POPULATE ? "contained" : "outlined"} onClick={() => changeBivariateMode(MODES.POPULATE)}>Populate</Button>
                <Button sx={{ m: 1 }} variant={bivariateMode === MODES.CHIP ? "contained" : "outlined"} onClick={() => changeBivariateMode(MODES.CHIP)}>Chip</Button> */}
                <Button sx={{ m: 1 }} variant={bivariateMode === MODES.COMBINE ? "contained" : "outlined"} onClick={() => changeBivariateMode(MODES.COMBINE)}>Combine</Button>
                <Button sx={{ m: 1 }} variant="outlined" color='success' onClick={fitRelation}>Fit Trend</Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                <Button sx={{ m: 1 }} variant={enableBrush ? 'contained' : 'outlined'} onClick={activeRegionalBrush}>Brush</Button>
                <Button sx={{ m: 1 }} onClick={clearRegional}>Clear regional</Button>
            </Box>
            <Button sx={{ m: 1 }} onClick={clearAll}>Clear all</Button>
            <div id='bivariate-distribution-div'></div>
        </Box >
    )
})

export default BiVariablePlot;