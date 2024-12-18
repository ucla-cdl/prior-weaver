import React, { useState, useRef, useEffect, forwardRef } from 'react';
import * as d3 from 'd3';
import axios from "axios";
import { Box, Button, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ParallelSankeyPlot({ variablesDict, updateVariable, entities, addEntities, synchronizeSankeySelection }) {

    const marginTop = 20;
    const marginRight = 40;
    const marginBottom = 30;
    const marginLeft = 40;
    const labelOffset = 25;

    const [brushSelections, setBrushSelections] = useState(new Map());
    const [sortableVariables, setSortableVariables] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);

    useEffect(() => {
        setSortableVariables(Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum));
        drawParallelSankeyPlot();
        populateEntities();
    }, [variablesDict]);

    useEffect(() => {
        populateEntities();
    }, [entities]);

    const populateEntities = () => {
        const divId = "sankey-div";
        const chartHeight = 400;
        const axisNum = Object.keys(variablesDict).length;
        const chartWidth = axisNum * 140;

        const svg = d3.select("#sankey-svg");

        const valueAxes = new Map(Object.entries(variablesDict).map(([varName, variable]) => [
            varName,
            d3.scaleLinear()
                .domain([variable.min, variable.max])
                .range([chartHeight - marginTop, marginBottom])
        ]));

        const variableAxes = d3.scalePoint()
            .domain(
                Object.values(variablesDict)
                    .sort((a, b) => a.sequenceNum - b.sequenceNum) // Sort by arranged sequence number
                    .map(d => d.name))
            .range([marginLeft, chartWidth - marginRight]);

        // Draw path for the entity
        const line = d3.line()
            .defined(([, value]) => value != null)
            .x(([key]) => variableAxes(key))
            .y(([key, value]) => valueAxes.get(key)(value));

            console.log("entities", Object.values(entities));
        svg.selectAll(".entity-path").remove();
        Object.values(entities)?.forEach(entity => {
            svg.append("path")
                .datum(entity) // Pass the entity directly
                .attr("class", "entity-path")
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("stroke-opacity", 0.4)
                .attr("d", d => line(Object.entries(d).filter(([key]) => key !== "id")));
        });
    }

    const drawParallelSankeyPlot = () => {
        const divId = "sankey-div";
        document.getElementById(divId).innerHTML = "";
        const chartHeight = 400;
        const axisNum = Object.keys(variablesDict).length;
        const chartWidth = axisNum * 140;

        let svg = d3.select("#" + divId).append("svg")
            .attr("id", "sankey-svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        const valueAxes = new Map(Object.entries(variablesDict).map(([varName, variable]) => [
            varName,
            d3.scaleLinear()
                .domain([variable.min, variable.max])
                .range([chartHeight - marginTop, marginBottom])
        ]));

        const variableAxes = d3.scalePoint()
            .domain(
                Object.values(variablesDict)
                    .sort((a, b) => a.sequenceNum - b.sequenceNum) // Sort by arranged sequence number
                    .map(d => d.name))
            .range([marginLeft, chartWidth - marginRight]);

        // Append the axis for each key.
        const axes = svg.append("g")
            .selectAll("g")
            .data(Object.entries(variablesDict).map(([varName, variable]) => varName))
            .join("g")
            .attr("transform", d => `translate(${variableAxes(d)}, 0)`)
            .each(function (d) {
                d3.select(this).call(d3.axisLeft(valueAxes.get(d)));
            })
            .call(g => g.append("text")
                .attr("x", 0)
                .attr("y", chartHeight - marginBottom + labelOffset)
                .attr("text-anchor", "middle")
                .attr("fill", "black")
                .text(d => d))
            .call(g => g.selectAll("text")
                .clone(true).lower()
                .attr("fill", "none")
                .attr("stroke-width", 5)
                .attr("stroke-linejoin", "round")
                .attr("stroke", "white"))

        // create line behavior
        let selectedPoints = new Array(axisNum).fill(null);
        axes.on("click", function (event, d) {
            svg.selectAll(".temp-circle").remove();
            svg.selectAll(".temp-line").remove();

            const [x, y] = d3.pointer(event);
            const axisValue = d;
            const varValue = valueAxes.get(axisValue).invert(y);

            const closestVarIndex = variableAxes.domain().indexOf(axisValue);
            selectedPoints[closestVarIndex] = { val: varValue, axis: axisValue };
            let submitEntity = true;
            for (let i = 0; i < selectedPoints.length; i++) {
                if (selectedPoints[i] !== null) {
                    svg.append("circle")
                        .attr("class", "temp-circle")
                        .attr("cx", variableAxes(selectedPoints[i].axis))
                        .attr("cy", valueAxes.get(selectedPoints[i].axis)(selectedPoints[i].val))
                        .attr("r", 4)
                        .attr("fill", "blue")
                        .append("title")
                        .text(`value: ${(selectedPoints[i].val).toFixed(2)}`);

                    if (i < selectedPoints.length - 1 && selectedPoints[i + 1] !== null) {
                        svg.append("line")
                            .attr("class", "temp-line")
                            .attr("x1", variableAxes(selectedPoints[i].axis))
                            .attr("y1", valueAxes.get(selectedPoints[i].axis)(selectedPoints[i].val))
                            .attr("x2", variableAxes(selectedPoints[i + 1].axis))
                            .attr("y2", valueAxes.get(selectedPoints[i + 1].axis)(selectedPoints[i + 1].val))
                            .attr("stroke", "black")
                            .attr("stroke-width", 1);
                    }
                }
                else {
                    submitEntity = false;
                }
            }

            if (submitEntity) {
                let entityData = {};
                for (let i = 0; i < selectedPoints.length; i++) {
                    entityData[selectedPoints[i].axis] = selectedPoints[i].val;
                }

                addEntities([entityData]);
                selectedPoints = new Array(axisNum).fill(null);

                // Remove all circles and lines
                svg.selectAll(".temp-circle").remove();
                svg.selectAll(".temp-line").remove();
            }
        });

        // Brush feature
        const deselectedColor = "#ddd";
        const selectedColor = "steelblue";
        const brushWidth = 30;
        const brush = d3.brushY()
            .extent([
                [-(brushWidth / 2), marginTop],
                [brushWidth / 2, chartHeight - marginBottom]
            ])
            .on("start brush end", brushed);

        axes.call(brush);
        const selections = new Map();

        function brushed(event, key) {
            const { selection } = event;

            if (selection === null) {
                selections.delete(key);
            } else {
                selections.set(key, selection.map(valueAxes.get(key).invert));
            }
            const selected = [];
            svg.selectAll("path").each(function (d) {
                if (d) {
                    const active = Array.from(selections).every(([key, [min, max]]) => d[key] >= min && d[key] <= max);
                    d3.select(this).style("stroke", active ? selectedColor : deselectedColor);
                    if (active) {
                        d3.select(this).raise();
                        selected.push(d);
                    }
                }
            });
            svg.node().value = selected;
            svg.dispatch("input");
            setBrushSelections(selections);
        }

        svg.node().value = Object.values(entities);

        svg.on("input", function () {
            const selectedEntities = svg.node().value;
            console.log("selectedEntities", selectedEntities);
            synchronizeSankeySelection(selectedEntities);
        });
    }

    // Randomly populate data points in the selected region
    const autoPopulateEntities = () => {
        const newEntitiesNum = 10;
        const newEntitiesData = [];
        for (let i = 0; i < newEntitiesNum; i++) {
            let entityData = {};
            Array.from(brushSelections).forEach(([varName, range]) => {
                const [min, max] = range;
                const randomValue = Math.random() * (max - min) + min;
                entityData[varName] = randomValue;
            });
            newEntitiesData.push(entityData);
        }

        addEntities(newEntitiesData);
    }

    function handleDragStart(event) {
        setDraggedItem(event.active.id);
    }

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setSortableVariables((items) => {
                const oldIndex = items.findIndex(item => item.name === active.id);
                const newIndex = items.findIndex(item => item.name === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);
                newItems.forEach((item, index) => {
                    updateVariable(item.name, "sequenceNum", index);
                });

                return newItems;
            });
        }

        setDraggedItem(null);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Button onClick={autoPopulateEntities}>Auto Populate Entities</Button>
            <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext
                        items={sortableVariables}
                        strategy={verticalListSortingStrategy}
                        style={{ display: 'flex', flexDirection: 'row' }}
                    >
                        {sortableVariables.map(item => {
                            return (
                                <SortableItem key={item.name} id={item.name} item={item} />
                            )
                        })}
                    </SortableContext>
                    <DragOverlay>
                        {draggedItem ? <Item id={draggedItem} /> : null}
                    </DragOverlay>
                </DndContext>
            </Box>

            <div id='sankey-div'>

            </div>
        </Box>
    )
}

export function SortableItem({ id, item }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Item ref={setNodeRef} id={id} style={style} {...attributes} {...listeners} />
    );
}

export const Item = forwardRef(({ id, ...props }, ref) => {
    return (
        <Box {...props} ref={ref} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 2 }}>
            <DragHandleIcon />
            <Typography>{id}</Typography>
        </Box>
    )
});