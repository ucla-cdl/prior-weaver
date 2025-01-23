import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { logUserBehavior } from '../utils/BehaviorListener';
import axios from "axios";
import { Box, Paper } from '@mui/material';


// Define the Variable Component
export default function VariablePlot({ variable, updateVariable, entities, addEntities, updateEntities }) {
    const chartWidth = 400;
    const chartHeight = 350;
    const offsetX = 60;
    const offsetY = 60;
    const toggleHeight = 8;
    const titleOffset = 50;

    useEffect(() => {
        drawPlot();
        console.log("draw plot");
    }, []);

    useEffect(() => {
        populateEntities();
    }, [entities]);

    const drawPlot = () => {
        const divID = "univariate-div-" + variable.name;
        document.getElementById(divID).innerHTML = "";
        // const chartWidth = document.getElementById(divID).clientWidth;

        let svg = d3.select("#" + divID).append("svg")
            .attr("id", "univariate-svg-" + variable.name)
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        svg.append("g")
            .attr("id", "univariate-histogram-" + variable.name);
    }

    const populateEntities = () => {
        document.getElementById("univariate-histogram-" + variable.name).innerHTML = "";
        let histogramPlot = d3.select("#univariate-histogram-" + variable.name);
        const chartWidth = document.getElementById("univariate-div-" + variable.name).clientWidth;

        let xScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([offsetX, chartWidth - offsetX]);

        let binInfos = [];
        for (let index = 0; index < variable.binEdges.length - 1; index++) {
            const leftEdge = variable.binEdges[index];
            const rightEdge = variable.binEdges[index + 1];
            const binEntities = Object.values(entities).filter(e => e[variable.name] >= leftEdge && e[variable.name] < rightEdge && e[variable.name] !== null);
            const binHeight = binEntities.length;
            binInfos.push({ height: binHeight, entities: binEntities });
        }

        let maxY = d3.max(binInfos.map(d => d.height)) < 8 ? 10 : d3.max(binInfos.map(d => d.height)) + 2;
        let yScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([chartHeight - offsetY, offsetY / 2]);

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
            .data(binInfos)
            .enter()
            .append('rect')
            .attr('x', (d, i) => xScale(variable.binEdges[i]))
            .attr('y', d => yScale(d.height))
            .attr('width', (d, i) => xScale(variable.binEdges[i + 1]) - xScale(variable.binEdges[i]))
            .attr('height', d => chartHeight - offsetY - yScale(d.height))
            .style('fill', 'lightblue')  // Light color for preview
            .style('stroke', 'black');

        // Add labels on top of bars
        let labels = histogramPlot.selectAll('text.label')
            .data(binInfos)
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', (d, i) => (xScale(variable.binEdges[i]) + xScale(variable.binEdges[i + 1])) / 2)
            .attr('y', d => yScale(d.height) - 10)
            .attr('text-anchor', 'middle')
            .text(d => d.height)
            .style('font-size', 14)
            .style('font-family', 'Times New Roman')
            .style('fill', 'black');

        let dragBehavior = d3.drag()
            .on('drag', function (event) {
                const index = d3.select(this).datum(); // Find the index of the current toggle being dragged
                let newHeight = Math.round(yScale.invert(event.y));
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
                const index = d3.select(this).datum(); // Find the index of the current toggle being dragged
                let newHeight = Math.round(yScale.invert(event.y));
                newHeight = Math.max(0, Math.min(newHeight, maxY));
                // Update entities
                // - if current count is larger than previous, then add new entities (randomly generated in the bin)
                let deltaHeight = newHeight - binInfos[index].height;
                if (deltaHeight > 0) {
                    let newEntitiesData = [];
                    for (let i = 0; i < deltaHeight; i++) {
                        newEntitiesData.push({
                            [variable.name]: Math.random() * (variable.binEdges[index + 1] - variable.binEdges[index]) + variable.binEdges[index]
                        });
                    }
                    addEntities(newEntitiesData);
                }
                // - if current count is smaller than previous, then update values of existing entities
                else if (deltaHeight < 0) {
                    let updatedEntities = binInfos[index].entities.slice(newHeight); // remove based on FIFO
                    console.log(updatedEntities);
                    let updatedEntitiesIDs = updatedEntities.map(e => e.id);
                    let updatedEntitiesData = updatedEntities.map(e => ({
                        [variable.name]: null
                    }));
                    updateEntities(updatedEntitiesIDs, updatedEntitiesData);
                }
            });

        histogramPlot.selectAll('rect.toggle')
            .data(d3.range(binInfos.length))  // Use the index range as data
            .enter()
            .append('rect')
            .attr('class', 'toggle')
            .attr('x', d => xScale(variable.binEdges[d]))
            .attr('y', d => yScale(binInfos[d].height) - toggleHeight)  // Use counts[d] since d is the index now
            .attr('width', d => xScale(variable.binEdges[d + 1]) - xScale(variable.binEdges[d]))
            .attr('height', toggleHeight)
            .attr('rx', 5)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', '1px')
            .call(dragBehavior);
    }

    return (
        <Box sx={{ mx: 2 }} id={"univariate-div-" + variable.name}>

        </Box>
    );
};