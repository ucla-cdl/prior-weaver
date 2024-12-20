import React, { useState, useRef, useEffect, forwardRef } from 'react';
import * as d3 from 'd3';
import axios from "axios";
import { Box, Button, FormControl, FormControlLabel, FormLabel, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Radio, RadioGroup, Typography } from '@mui/material';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import "./ParallelSankeyPlot.css";

export default function ParallelSankeyPlot({ variablesDict, updateVariable, entities, addEntities, updateEntities, synchronizeSankeySelection }) {
    const marginTop = 20;
    const marginRight = 40;
    const marginBottom = 30;
    const marginLeft = 40;
    const labelOffset = 25;
    const chartHeight = 400;

    const [brushSelections, setBrushSelections] = useState(new Map());
    const [sortableVariables, setSortableVariables] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [selectedCircle, setSelectedCircle] = useState(null);

    const [activeInteraction, setActiveInteraction] = useState(null);

    const valueAxesRef = useRef(new Map());
    const variableAxesRef = useRef(null);

    /**
     * Define interaction types
     * 
     * TYPES:
     * - ADD: Add a new entity
     * - DRAG: Drag an entity
     * - BRUSH: Brush to select entities
     */
    const INTERACTION_TYPES = {
        ADD: "add",
        CONNECT: "connect",
        BRUSH: "brush",
    }

    useEffect(() => {
        setSortableVariables(Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum));
        updatePlotLayout();
        populateEntities();
    }, [variablesDict]);

    useEffect(() => {
        populateEntities();
    }, [entities]);

    const updatePlotLayout = () => {
        const divId = "sankey-div";
        document.getElementById(divId).innerHTML = "";
        const axisNum = Object.keys(variablesDict).length;
        const chartWidth = axisNum * 140;

        let svg = d3.select("#" + divId).append("svg")
            .attr("id", "sankey-svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        const newValueAxes = new Map(Object.entries(variablesDict).map(([varName, variable]) => [
            varName,
            d3.scaleLinear()
                .domain([variable.min, variable.max])
                .range([chartHeight - marginTop, marginBottom])
        ]));

        const newVariableAxes = d3.scalePoint()
            .domain(
                Object.values(variablesDict)
                    .sort((a, b) => a.sequenceNum - b.sequenceNum) // Sort by arranged sequence number
                    .map(d => d.name))
            .range([marginLeft, chartWidth - marginRight]);

        // Append the axis for each key.
        svg.append("g")
            .selectAll("g")
            .data(Object.entries(variablesDict).map(([varName, variable]) => varName))
            .join("g")
            .attr("transform", d => `translate(${newVariableAxes(d)}, 0)`)
            .each(function (d) {
                d3.select(this).call(d3.axisLeft(newValueAxes.get(d)));
            })
            .attr("class", "axis")
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
                .attr("stroke", "white"));

        valueAxesRef.current = newValueAxes;
        variableAxesRef.current = newVariableAxes;
    }

    const changeInteractionType = (interactionType) => {
        console.log("Change interaction type to: ", interactionType);
        clearInteractions();

        switch (interactionType) {
            case INTERACTION_TYPES.CONNECT:
                activateConnectFeature();
                break;
            case INTERACTION_TYPES.ADD:
                addAxisRegion();
                activateAddFeature();
                break;
            case INTERACTION_TYPES.BRUSH:
                activateBrushFeature();
                break;
            default:
                break;
        }

        setActiveInteraction(interactionType);
    }

    const clearInteractions = () => {
        const svg = d3.select("#sankey-svg");
        // Remove Add feature interactions
        svg.selectAll(".axis-region").remove();
        svg.selectAll(".temp-circle").remove();
        svg.selectAll(".temp-line").remove();

        // Remove Connect feature interactions
        svg.selectAll(".entity-dot").attr("fill", "white");
        svg.selectAll(".entity-dot").on("mouseover", null).on("mouseout", null).on("click", null);
        setSelectedCircle(null);

        // Remove brush feature interactions
        svg.selectAll(".axis")
            .on("mousedown.brush mousemove.brush mouseup.brush", null);
        svg.selectAll(".selection").remove();
        svg.selectAll(".handle").remove();
        svg.selectAll(".overlay").remove();
        svg.on("start brush end", null);
        svg.selectAll(".brush-selection").attr("class", "entity-path");
        svg.selectAll(".brush-non-selection").attr("class", "entity-path");
        setBrushSelections(new Map());
    }

    const addAxisRegion = () => {
        const svg = d3.select("#sankey-svg");

        svg.selectAll(".axis")
            .append("rect")
            .attr("class", "axis-region")
            .attr("x", -10)
            .attr("y", marginTop)
            .attr("width", 20)
            .attr("height", chartHeight - marginTop - marginBottom)
            .attr("fill", "transparent")
            .attr("pointer-events", "all")
    }

    const populateEntities = () => {
        const svg = d3.select("#sankey-svg");

        // Draw path for the entity
        const line = d3.line()
            .curve(d3.curveMonotoneX) // Apply a curve to the line
            .defined(([, value]) => value != null)
            .x(([key]) => variableAxesRef.current(key))
            .y(([key, value]) => valueAxesRef.current.get(key)(value));

        svg.selectAll(".entity-path").remove();
        svg.selectAll(".entity-dot").remove();

        /**
         * Draw entities
         * 
         * Draw circles for values on each axis
         * Draw path for entities across axes
         */
        Object.values(entities).forEach(entity => {
            Object.entries(entity).filter(([key]) => key !== "id").forEach(([key, value]) => {
                if (value !== null) {
                    svg.append("circle")
                        .attr("class", "entity-dot")
                        .attr("cx", variableAxesRef.current(key))
                        .attr("cy", valueAxesRef.current.get(key)(value))
                        .attr("r", 4)
                        .attr("fill", "white")
                        .attr("stroke", "black")
                        .attr("stroke-width", 1)
                }
            });

            svg.append("path")
                .datum(entity) // Pass the entity directly
                .attr("class", "entity-path")
                .attr("d", d => line(
                    sortableVariables
                        .filter(variable => d[variable.name] !== null)
                        .map(variable => [variable.name, d[variable.name]])
                ))
        });

        svg.selectAll(".entity-dot")
            .raise();
    }

    const activateAddFeature = () => {
        const svg = d3.select("#sankey-svg");
        const axisNum = Object.keys(variablesDict).length;
        let selectedPoints = new Array(axisNum).fill(null);

        svg.selectAll(".axis-region")
            .on("click", function (event, d) {
                svg.selectAll(".temp-circle").remove();
                svg.selectAll(".temp-line").remove();

                const [x, y] = d3.pointer(event);
                const axisValue = d;

                const varValue = valueAxesRef.current.get(axisValue).invert(y);
                const axisIndex = variableAxesRef.current.domain().indexOf(axisValue);

                selectedPoints[axisIndex] = { val: varValue, axis: axisValue };
                let submitEntity = true;
                for (let i = 0; i < selectedPoints.length; i++) {
                    if (selectedPoints[i] !== null) {
                        svg.append("circle")
                            .attr("class", "temp-circle")
                            .attr("cx", variableAxesRef.current(selectedPoints[i].axis))
                            .attr("cy", valueAxesRef.current.get(selectedPoints[i].axis)(selectedPoints[i].val))
                            .attr("r", 4)
                            .attr("fill", "blue")

                        if (i < selectedPoints.length - 1 && selectedPoints[i + 1] !== null) {
                            svg.append("line")
                                .attr("class", "temp-line")
                                .attr("x1", variableAxesRef.current(selectedPoints[i].axis))
                                .attr("y1", valueAxesRef.current.get(selectedPoints[i].axis)(selectedPoints[i].val))
                                .attr("x2", variableAxesRef.current(selectedPoints[i + 1].axis))
                                .attr("y2", valueAxesRef.current.get(selectedPoints[i + 1].axis)(selectedPoints[i + 1].val))
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
    }

    const activateConnectFeature = () => {
        const svg = d3.select("#sankey-svg");

        svg.selectAll(".entity-dot")
            .on("mouseover", function () {
                d3.select(this).classed("hovered-entity-dot", true);
            })
            .on("mouseout", function () {
                d3.select(this).classed("hovered-entity-dot", false);
            })
            .on("click", function (event) {
                d3.selectAll(".entity-dot").classed("selected-entity-dot", false);
                d3.select(this).classed("selected-entity-dot", true);

                const cx = d3.select(this).attr("cx");
                const cy = d3.select(this).attr("cy");

                const key = Object.keys(variablesDict).find(key => variableAxesRef.current(key) === +cx);
                const value = valueAxesRef.current.get(key).invert(cy);

                setSelectedCircle({ key, value });
            })
    }

    const activateBrushFeature = () => {
        const svg = d3.select("#sankey-svg");
        const brushWidth = 50;
        const selections = new Map();

        const brush = d3.brushY()
            .extent([
                [-(brushWidth / 2), marginTop],
                [brushWidth / 2, chartHeight - marginBottom]
            ])
            .on("start brush end", brushed);

        function brushed(event, key) {
            const { selection } = event;

            if (selection === null) {
                selections.delete(key);
            } else {
                selections.set(key, selection.map(valueAxesRef.current.get(key).invert));
            }
            const selected = [];
            svg.selectAll("path").each(function (d) {
                if (d) {
                    const active = Array.from(selections).every(([key, [max, min]]) => d[key] >= min && d[key] <= max);
                    d3.select(this).attr("class", active ? "brush-selection" : "brush-non-selection");
                    if (active) {
                        d3.select(this).raise();
                        selected.push(d);
                    }
                }
            });

            svg.selectAll(".entity-dot")
                .raise();

            svg.node().value = selected;
            svg.dispatch("input");
            setBrushSelections(selections);
        }

        svg.node().value = Object.values(entities);

        svg.on("input", function () {
            const selectedEntities = svg.node().value;
            synchronizeSankeySelection(selectedEntities);
        });

        svg.selectAll(".axis")
            .call(brush)
            .call(brush.move, null) // Clear the brush selection
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
        <Box>
            <Box sx={{ my: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ my: 1 }}>
                    <Button variant='outlined' onClick={autoPopulateEntities}>Auto Populate Entities</Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', ml: 2 }}>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">Interaction Type</FormLabel>
                        <RadioGroup
                            row
                            aria-label="interactionType"
                            name="interactionType"
                            value={activeInteraction}
                            onChange={(event) => changeInteractionType(event.target.value)}
                        >
                            {Object.values(INTERACTION_TYPES).map(type => (
                                <FormControlLabel key={type} value={type} control={<Radio />} label={type} />
                            ))}
                        </RadioGroup>
                    </FormControl>
                </Box>
            </Box>

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

            <Box sx={{ mx: 'auto' }} id='sankey-div'>

            </Box>
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