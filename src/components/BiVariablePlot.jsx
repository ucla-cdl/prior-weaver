import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Button, Grid2 } from '@mui/material';
import { logUserBehavior } from '../utils/BehaviorListener';
import axios from "axios";

const BiVariablePlot = React.forwardRef(({ biVariableDict, biVariable1, biVariable2, updateVariable, updateBivariable, entities }, ref) => {
    const chartWidth = 350;
    const chartHeight = 350;
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const marginalPlotWidth = 0; // y-axis marginal hist
    const marginalPlotHeight = 0; // x-axis marginal hist
    const mainPlotWidth = chartWidth - margin.left - margin.right - marginalPlotWidth;
    const mainPlotHeight = chartHeight - margin.top - margin.bottom - marginalPlotHeight;
    const dotRadius = 5; // Radius of each dot
    const marginDotRadius = 4;
    const toggleHeight = 7;
    const labelOffset = 12;
    const titleOffset = 40;

    const MODES = { "PREDICT": 0, "POPULATE": 1, "CHIP": 2, "COMBINE": 3 };
    const COLORS = { "PREDICT_DOT": "orange", "POPULATE_DOT": "blue", "CHIP_DOT": "blue" }
    const [bivariateMode, setBivariateMode] = useState('COMBINE');
    const [selectedDots, setSelectedDots] = useState([]);
    const [enableSelection, setEnableSelection] = useState(false);

    React.useImperativeHandle(ref, () => ({
        synchronizeSelection,
    }));

    useEffect(() => {
        drawPlot();
        drawGridPlot();
        populateEntities();
    }, [biVariable1, biVariable2])

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

        console.log("populate entities in bivar");

        const specifiedEntities = Object.values(entities).filter(d => d[biVariable1.name] !== null && d[biVariable2.name] !== null);

        mainPlot.selectAll(".entity-dot").remove();

        specifiedEntities.forEach(entity => {
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
        // for (let i = 0; i < biVariable1.binEdges.length - 1; i++) {
        //     const curGridX = xScale(biVariable1.binEdges[i]);
        //     const nextGridX = xScale(biVariable1.binEdges[i + 1]);
        //     for (let j = 0; j < biVariable2.binEdges.length - 1; j++) {
        //         const curGridY = yScale(biVariable2.binEdges[j]);
        //         const nextGridY = yScale(biVariable2.binEdges[j + 1]);

        //         mainPlot.append("rect")
        //             .attr("class", "grids")
        //             .attr("id", `grid-${i}-${j}`)
        //             .attr("x", curGridX)
        //             .attr("y", nextGridY)
        //             .attr("width", nextGridX - curGridX)
        //             .attr("height", curGridY - nextGridY)
        //             .attr("fill", "transparent")
        //             .attr("stroke", "lightgray")
        //             .on("mouseover", function () {
        //                 d3.select(this)
        //                     .attr("fill", "whitesmoke")
        //                     .attr("stroke", "gray");
        //             })
        //             .on("mouseout", function () {
        //                 d3.select(this)
        //                     .attr("fill", "transparent")
        //                     .attr("stroke", "lightgray");
        //             })
        //     }
        // }

        // populateEntities();
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
                    updateVariable(biVariable1.name, { "counts": newCounts });
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
                updateVariable(biVariable2.name, { "counts": newCounts });
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
                updateCombineDots("minus", xScale, yScale, binIndexX, binIndexY);
            })


        // add interaction to grids
        d3.selectAll(".grids")
            .on("click", function (event) {
                const [clickX, clickY] = d3.pointer(event);

                let clickValueX = xScale.invert(clickX);
                let clickValueY = yScale.invert(clickY);

                const { binIndexX, binIndexY } = findGird(clickValueX, clickValueY);

                // Find the available Grid
                if (binIndexX !== -1 && binIndexY !== -1) {
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
        updateBivariable(biVarName, { "populateDots": newPopulateDots });
        updateVariable(biVariable1.name, { "counts": newBivar1Counts });
        updateVariable(biVariable2.name, { "counts": newBivar2Counts });
    }

    const fitRelation = () => {
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        axios
            .post(window.BACKEND_ADDRESS + "/fitBiVarRelation", {
                populateDots: biVariableDict[biVarName].populateDots,
                chipDots: biVariableDict[biVarName].chipDots
            })
            .then((resp) => {
                updateBivariable(biVarName, { 
                    "fittedRelation": resp.data,
                    "specified": true,
                });
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

        updateBivariable(biVarName, {
            "predictionDots": [],
            "populateDots": [],
            "chipDots": [],
            "fittedRelation": {},
        });
    }

    const activeRegionalSelection = () => {
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

        if (enableSelection) {
            mainPlot.selectAll(".brush").remove();
            setEnableSelection(false);
        }
        else {
            mainPlot.append("g")
                .attr("class", "brush")
                .call(brush);
            setEnableSelection(true);
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
        updateVariable(biVariable1.name, { "counts": newBivar1Counts });
        updateVariable(biVariable2.name, { "counts": newBivar2Counts });

        updateBivariable(biVarName, {
            "populateDots": newPopulateDots,
            "chipDots": newChipDots,
        });
        setSelectedDots([]);
    }

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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                <Button sx={{ m: 1 }} variant="outlined" color='success' onClick={fitRelation}>Fit Trend</Button>
                <Button sx={{ m: 1 }} variant={enableSelection ? 'contained' : 'outlined'} onClick={activeRegionalSelection}>Selection</Button>
                <Button sx={{ m: 1 }} onClick={clearRegional}>Clear regional</Button>
                <Button sx={{ m: 1 }} onClick={clearAll}>Clear all</Button>
            </Box> */}
            <div id='bivariate-distribution-div'></div>
        </Box >
    )
})

export default BiVariablePlot;