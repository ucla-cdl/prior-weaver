import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { logUserBehavior } from '../utils/BehaviorListener';
import axios from "axios";
import { Box, Paper } from '@mui/material';
import "./VariablePlot.css";

// Define the Variable Component
export default function VariablePlot({ variableDict, variable, updateVariable, entities, addEntities, updateEntities, deleteEntities }) {
    const svgWidth = 300;
    const svgHeightRef = useRef(0);
    const marginX = 40;
    const marginTop = 30;
    const marginBottom = 40;
    const labelOffset = 35;

    useEffect(() => {
        drawPlot();
    }, [variable]);

    useEffect(() => {
        drawRoulette();
    }, [variable, entities]);

    const drawPlot = () => {
        const container = d3.select(`#univariate-container-${variable.name}`);
        container.html("");

        const svgHeight = container.node().clientHeight;
        svgHeightRef.current = svgHeight;

        container.append("svg")
            .attr("id", `univariate-svg-${variable.name}`)
            .attr("width", svgWidth)
            .attr("height", svgHeight);
    }

    const drawRoulette = () => {
        console.log("populate entities in univariate plot");

        let svg = d3.select(`#univariate-svg-${variable.name}`);
        svg.html("");
        let chart = svg.append("g")
            .attr("transform", `translate(${marginX}, ${marginTop})`);

        let chartWidth = svgWidth - marginX * 2;
        let chartHeight = svgHeightRef.current - marginTop - marginBottom;

        // Add total entities text in top margin
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${chartWidth / 2}, ${- marginTop / 2})`)
            .style("font-size", "14px")
            .style("fill", "#666")
            .text(`Total Entities: ${Object.values(entities).filter(e => e[variable.name] !== null).length}`);

        let xScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([0, chartWidth]);

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
            .range([chartHeight, 0]);

        // Draw X axis
        chart.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale)
                .tickValues(variable.binEdges)
                .tickFormat(d3.format("d"))
            )
            .selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman");

        // Add X axis label
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${chartWidth / 2}, ${chartHeight + labelOffset})`)
            .style("font-size", "14px")
            .text(`${variable.name} (${variable.unitLabel})`);

        // Draw Y axis
        chart.append('g')
            .attr('transform', `translate(0, 0)`)
            .call(d3.axisLeft(yScale)
                .tickValues(d3.range(0, maxY + 1))
            )
            .selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman");

        // Add Y axis label
        chart
            .append("g")
            .attr('transform', `translate(${- marginX / 2}, ${chartHeight / 2})`)
            .append("text")
            .attr("text-anchor", "middle")
            .attr('transform', 'rotate(-90)')
            .style("font-size", "14px")
            .style("font-family", "Times New Roman")
            .text("Count");

        // Draw Interactive Grid
        for (let grid = 1; grid <= maxY; grid++) {
            for (let bin = 0; bin < variable.binEdges.length - 1; bin++) {
                const index = bin;
                const binCnt = binInfos[index].height;
                chart.append("rect")
                    .attr("class", binCnt >= grid ? "fill-grid-cell" : "non-fill-grid-cell")
                    .attr("id", `${variable.name}-${grid}-${bin}`)
                    .attr("transform", `translate(${xScale(variable.binEdges[bin])}, ${yScale(grid)})`)
                    .attr("width", xScale(variable.binEdges[bin + 1]) - xScale(variable.binEdges[bin]))
                    .attr("height", yScale(grid) - yScale(grid + 1))
                    .on("mouseover", function (event, d) {
                        d3.select(this)
                            .classed(binCnt >= grid ? "fill-grid-cell" : "non-fill-grid-cell", false)
                            .classed("hover-grid-cell", true);
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .classed("hover-grid-cell", false)
                            .classed(binCnt >= grid ? "fill-grid-cell" : "non-fill-grid-cell", true);
                    })
                    .on("click", function (event, d) {
                        // Update entities
                        let deltaHeight = grid - binInfos[index].height;
                        // - if current count is larger than previous, then add new entities (randomly generated in the bin)
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
                            let updatedEntities = binInfos[index].entities.slice(grid); // remove based on FIFO

                            // Separate entities into those to delete and those to update
                            let entitiesToDelete = [];
                            let entitiesToUpdate = [];

                            updatedEntities.forEach(entity => {
                                // Check if entity would have all null values after update
                                let wouldBeAllNull = true;
                                for (let key in entity) {
                                    if (key !== 'id' && key !== variable.name && entity[key] !== null) {
                                        wouldBeAllNull = false;
                                        break;
                                    }
                                }

                                if (wouldBeAllNull) {
                                    entitiesToDelete.push(entity.id);
                                } else {
                                    entitiesToUpdate.push({
                                        id: entity.id,
                                        data: { [variable.name]: null }
                                    });
                                }
                            });

                            // Delete entities that would have all null values
                            if (entitiesToDelete.length > 0) {
                                deleteEntities(entitiesToDelete);
                            }

                            // Update remaining entities
                            if (entitiesToUpdate.length > 0) {
                                updateEntities(
                                    entitiesToUpdate.map(e => e.id),
                                    entitiesToUpdate.map(e => e.data)
                                );
                            }
                        }
                    });
            }
        }
    }

    return (
        <Box id={`univariate-container-${variable.name}`} sx={{ height: '100%', boxSizing: 'border-box' }}>
        </Box>
    );
};