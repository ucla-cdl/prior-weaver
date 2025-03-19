import './BiVariablePlot.css';
import React, { useState, useRef, useEffect, useContext } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';
import { SelectionContext, SELECTION_SOURCES, SELECTION_TYPE } from '../contexts/SelectionContext';

export default function BiVariablePlot() {
    const { leftPanelOpen, rightPanelOpen } = useContext(WorkspaceContext);
    const { biVariable1, biVariable2 } = useContext(VariableContext);
    const { entities } = useContext(EntityContext);
    const { activeFilter, setSelectedEntities, isHidden, selections, updateSelections, selectionsRef, selectionSource, selectionGroup1Entities, selectionGroup2Entities, selectionType } = useContext(SelectionContext);

    const chartWidthRef = useRef(0);
    const chartHeightRef = useRef(0);
    const margin = { top: 10, right: 10, bottom: 40, left: 40 };
    const dotRadius = 5;
    const titleOffset = 30;

    const xScaleRef = useRef(null);
    const yScaleRef = useRef(null);

    useEffect(() => {
        drawPlot();
        populateEntities();
    }, [leftPanelOpen, rightPanelOpen, biVariable1, biVariable2])

    useEffect(() => {
        populateEntities();
    }, [entities])

    useEffect(() => {
        const fromExternal = selectionSource === SELECTION_SOURCES.PARALLEL;
        const newSelectedEntities = updateHighlightedEntities();
        if (!fromExternal) {
            setSelectedEntities(newSelectedEntities);
        }
    }, [activeFilter, selections]);

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
        xScaleRef.current = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, chartWidthRef.current]);
        yScaleRef.current = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([chartHeightRef.current, 0]);

        console.log("populate entities in bivar");

        const specifiedEntities = Object.values(entities).filter(d => d[biVariable1.name] !== null && d[biVariable2.name] !== null);

        chart.selectAll(".bivar-dot").remove();

        specifiedEntities.forEach(entity => {
            chart.append("circle")
                .datum(entity)
                .attr("id", `bivar-dot-${entity.id}`)
                .attr("class", "bivar-dot")
                .attr("cx", d => xScaleRef.current(d[biVariable1.name]))
                .attr("cy", d => yScaleRef.current(d[biVariable2.name]))
                .attr("r", dotRadius)
        });

        // Add brush selection
        const brush = d3.brush()
            .extent([[0, 0], [chartWidthRef.current, chartHeightRef.current]])
            .on("start brush end", (event) => {
                if (event.sourceEvent === null) return;
                brushed(event);
            });

        chart.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, null);

        function brushed(event) {
            const { selection } = event;
            const currentSelections = new Map(selectionsRef.current);

            if (selection === null) {
                // If brush is cleared, only remove selections for these two variables
                currentSelections.delete(biVariable1.name);
                currentSelections.delete(biVariable2.name);
            }
            else {
                // Update selections
                const [[x0, y0], [x1, y1]] = selection;
                currentSelections.set(biVariable1.name, [xScaleRef.current.invert(x1), xScaleRef.current.invert(x0)]);
                currentSelections.set(biVariable2.name, [yScaleRef.current.invert(y0), yScaleRef.current.invert(y1)]);
            }

            selectionsRef.current = currentSelections;
            updateSelections(selectionsRef.current, SELECTION_SOURCES.BIVARIATE);
        }

        updateHighlightedEntities();
    }

    const updateHighlightedEntities = () => {
        let chart = d3.select("#bivariate-chart");
        const newSelectedEntities = [];

        // Update dots based on whether they fall within the brush selection
        Object.entries(entities).forEach(([entityId, entity]) => {
            if (entity[biVariable1.name] === null || entity[biVariable2.name] === null) {
                return;
            }

            if (selectionGroup1Entities.includes(entity) || selectionGroup2Entities.includes(entity)) {
                return;
            }

            const active = selectionsRef.current.size !== 0 && Array.from(selectionsRef.current).every(([key, [max, min]]) => {
                if (entity[key] === null) return false;
                return entity[key] >= min && entity[key] <= max;
            });

            const isEntityHidden = isHidden(entity);

            if (isEntityHidden) {
                d3.select(`#bivar-dot-${entityId}`)
                    .classed("hidden-dot", true)
                    .classed("selection-dot", false)
                    .classed("non-selection-dot", false)
                    .classed("group-1-dot", false)
                    .classed("group-2-dot", false);
            }
            else {
                d3.select(`#bivar-dot-${entityId}`)
                    .classed("hidden-dot", false)
                    .classed("selection-dot", active)
                    .classed("non-selection-dot", !active)
                    .classed("group-1-dot", active && selectionType === SELECTION_TYPE.GROUP_1)
                    .classed("group-2-dot", active && selectionType === SELECTION_TYPE.GROUP_2);

                if (active) {
                    newSelectedEntities.push(entity);
                }
            }
        });

        chart.selectAll(".non-selection-dot").raise();
        chart.selectAll(".selection-dot").raise();

        return newSelectedEntities;
    }

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box id='bivariate-distribution-div' sx={{ height: '100%', width: '100%' }}></Box>
        </Box >
    )
}