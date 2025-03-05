import './BiVariablePlot.css';
import React, { useState, useRef, useEffect, useContext } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';

export default function BiVariablePlot() {
    const { leftPanelOpen, rightPanelOpen } = useContext(WorkspaceContext);
    const { biVariable1, biVariable2 } = useContext(VariableContext);
    const { entities, selectedEntities, setSelectedEntities } = useContext(EntityContext);
    const chartWidthRef = useRef(0);
    const chartHeightRef = useRef(0);
    const margin = { top: 10, right: 10, bottom: 40, left: 40 };
    const dotRadius = 5; // Radius of each dot
    const titleOffset = 30;
    
    useEffect(() => {
        drawPlot();
        populateEntities();
    }, [leftPanelOpen, rightPanelOpen, biVariable1, biVariable2])

    useEffect(() => {
        populateEntities();
    }, [entities])

    const drawPlot = () => {
        const container = d3.select("#bivariate-distribution-div");
        container.html("");

        const svgWidth = container.node().clientWidth;
        const svgHeight = container.node().clientHeight;

        let svg = container.append("svg")
            .attr("id", "bivariate-svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight)

        let chart = svg.append("g")
            .attr("id", "bivariate-chart")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        let chartWidth = svgWidth - margin.left - margin.right;
        let chartHeight = svgHeight - margin.top - margin.bottom;
        chartWidthRef.current = chartWidth;
        chartHeightRef.current = chartHeight;

        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, chartWidth]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([chartHeight, 0]);

        // Draw X axis
        chart.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale)
                .tickValues(biVariable1.binEdges)
                .tickSize(-chartHeight))  // Extend the tick lines across the width of the chart
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        // X axis title
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight + titleOffset)
            .style("font-size", "14px")
            .text(`${biVariable1.name} (${biVariable1.unitLabel})`);
            
        // Draw Y axis
        chart.append('g')
            .attr("transform", `translate(0, 0)`)
            .call(d3.axisLeft(yScale)
                .tickValues(biVariable2.binEdges)
                .tickSize(-chartWidth))  // Extend the tick lines across the width of the chart
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        // Y axis title
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -chartHeight / 2)
            .attr("y", -titleOffset)
            .style("font-size", "14px")
            .text(`${biVariable2.name} (${biVariable2.unitLabel})`);

        chart.selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman")
    }

    const populateEntities = () => {
        let chart = d3.select("#bivariate-chart");
        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, chartWidthRef.current]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([chartHeightRef.current, 0]);

        console.log("populate entities in bivar");

        const specifiedEntities = Object.values(entities).filter(d => d[biVariable1.name] !== null && d[biVariable2.name] !== null);

        chart.selectAll(".bivar-entity-dot").remove();

        specifiedEntities.forEach(entity => {
            chart.append("circle")
                .datum(entity)
                .attr("class", "bivar-entity-dot")
                .attr("cx", d => xScale(d[biVariable1.name]))
                .attr("cy", d => yScale(d[biVariable2.name]))
                .attr("r", dotRadius)
                .attr('stroke', 'black')
                .attr("fill", "white")
        });

        // Add brush selection
        const brush = d3.brush()
            .extent([[0, 0], [chartWidthRef.current, chartHeightRef.current]])
            .on("start brush end", brushed);

        chart.append("g")
            .attr("class", "brush")
            .call(brush);

        function brushed(event) {
            if (!event.selection) {
                // If brush is cleared, reset all dots
                chart.selectAll(".bivar-entity-dot")
                    .classed("brush-selection", false)
                    .classed("brush-non-selection", false);
                setSelectedEntities([]);
                return;
            }

            const [[x0, y0], [x1, y1]] = event.selection;
            const xScale = d3.scaleLinear()
                .domain([biVariable1.min, biVariable1.max])
                .range([0, chartWidthRef.current]);
            const yScale = d3.scaleLinear()
                .domain([biVariable2.min, biVariable2.max])
                .range([chartHeightRef.current, 0]);

            // Update dots based on whether they fall within the brush selection
            chart.selectAll(".bivar-entity-dot")
                .each(function(d) {
                    const dot = d3.select(this);
                    const cx = xScale(d[biVariable1.name]);
                    const cy = yScale(d[biVariable2.name]);
                    const selected = x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
                    
                    dot.classed("brush-selection", selected)
                        .classed("brush-non-selection", !selected);
                });
        }
    }

    

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box id='bivariate-distribution-div' sx={{ height: '100%', width: '100%' }}></Box>
        </Box >
    )
}