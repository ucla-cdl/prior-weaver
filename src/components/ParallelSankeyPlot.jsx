import React, { useState, useRef, useEffect, forwardRef } from 'react';
import * as d3 from 'd3';
import axios from "axios";
import { Box, Button, Checkbox, FormControl, FormControlLabel, FormLabel, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Radio, RadioGroup, ToggleButton, Typography } from '@mui/material';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DndContext, closestCenter, DragOverlay, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import "./ParallelSankeyPlot.css";

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
    SELECTION: "selection",
}


/**
 * Define filter types
 * 
 * TYPES:
 * - FULLY: All axes are connected
 * - PARTIALLY: Some axes are connected
 * - NONE: No axis is connected
 */
const FILTER_TYPES = {
    FULLY: 'fully',
    PARTIALLY: 'partially',
    NONE: 'none',
}

export default function ParallelSankeyPlot({ variablesDict, updateVariable, entities, addEntities, deleteEntities, updateEntities, synchronizeSankeySelection }) {
    const marginTop = 20;
    const marginBottom = 30;
    const marginRight = 80;
    const marginLeft = 80;
    const labelOffset = 25;
    const chartHeight = 350;

    const [brushSelectedRegions, setBrushSelectedRegions] = useState(new Map());
    const [selectedEntities, setSelectedEntities] = useState([]);
    const [sortableVariables, setSortableVariables] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [connectedPoint, setConnectedPoint] = useState(null);

    const [activeInteraction, setActiveInteraction] = useState(INTERACTION_TYPES.SELECTION);
    const [activeFilter, setActiveFilter] = useState(null);
    const [axesFilterStatus, setAxesFilterStatus] = useState({});

    const valueAxesRef = useRef(new Map());
    const variableAxesRef = useRef(null);

    useEffect(() => {
        setSortableVariables(Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum));
        setAxesFilterStatus(Object.keys(variablesDict).reduce((acc, key) => {
            acc[key] = false;
            return acc;
        }, {}));
        updatePlotLayout();
        populateEntities();
    }, [variablesDict]);

    useEffect(() => {
        populateEntities();
    }, [entities]);

    useEffect(() => {
        filterEntities(activeFilter);
    }, [axesFilterStatus]);

    const updatePlotLayout = () => {
        const divId = "sankey-div";
        document.getElementById(divId).innerHTML = "";
        const axisNum = Object.keys(variablesDict).length;
        // const chartWidth = axisNum * 140;
        const chartWidth = d3.select("#" + divId).node().getBoundingClientRect().width;

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

    const changeInteractionType = (interactionType, isInit = false) => {
        if (isInit) {
            interactionType = activeInteraction;
        }

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
            case INTERACTION_TYPES.SELECTION:
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
        setConnectedPoint(null);

        // Remove brush feature interactions
        svg.selectAll(".axis")
            .on("mousedown.brush mousemove.brush mouseup.brush", null);
        svg.selectAll(".selection").remove();
        svg.selectAll(".handle").remove();
        svg.selectAll(".overlay").remove();
        svg.on("start brush end", null);
        setBrushSelectedRegions(new Map());
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
            // .defined(([, value]) => value != null)
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
                        .attr("id", `dot_${entity["id"]}_${key}`)
                        .attr("cx", variableAxesRef.current(key))
                        .attr("cy", valueAxesRef.current.get(key)(value))
                        .attr("r", 4)
                        .attr("fill", "white")
                        .attr("stroke", "black")
                        .attr("stroke-width", 1)
                }
            });

            if (sortableVariables.some(variable => entity[variable.name] === null)) {
                svg.append("path")
                    .datum(entity)
                    .attr("class", "entity-path highlighted-path")
                    .attr("d", d => line(
                        sortableVariables
                            .filter(variable => d[variable.name] !== null)
                            .map(variable => [variable.name, d[variable.name]])
                    ));
            }

            svg.append("path")
                .datum(entity) // Pass the entity directly
                .attr("class", "entity-path brush-selection")
                .attr("d", d => line(
                    sortableVariables
                        .filter(variable => d[variable.name] !== null)
                        .map(variable => [variable.name, d[variable.name]])
                ))
        });

        svg.selectAll(".entity-dot")
            .raise();

        changeInteractionType(null, true);
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

    /**
     * Connect feature:
     * 1. Select individual data points
     * 2. 
     * 
     * PROBLEM:
     * - what if user select non-neighboring data points?
     */
    const activateConnectFeature = () => {
        const svg = d3.select("#sankey-svg");
        let connectedPoint = null;

        svg.selectAll(".entity-dot")
            .on("mouseover", function () {
                d3.select(this).classed("hovered-entity-dot", true);
            })
            .on("mouseout", function () {
                d3.select(this).classed("hovered-entity-dot", false);
            })
            .on("click", function (event) {
                d3.select(this).classed("connect-entity-dot", true);
                const [_, clickEntityId, clickAxis] = d3.select(this).attr("id").split("_");

                /**
                 * If there is already a connnected point,
                 * - If these two points are on neighboring axes, draw a line between them
                 * - If these two points are not on neighboring axes, notify the user
                 * - If these two points are on the same axis, notify the user
                 */
                if (connectedPoint) {
                    const connectedEntity1 = { ...entities[connectedPoint.entityId] };
                    const connectedEntity2 = { ...entities[clickEntityId] };

                    console.log("entity", connectedEntity1, connectedEntity2);

                    let isDuplicate = false;
                    let combinedEntityData = {};

                    Object.keys(variablesDict).forEach((varName) => {
                        const value1 = connectedEntity1[varName];
                        const value2 = connectedEntity2[varName];

                        if (value1 !== null && value2 !== null) {
                            isDuplicate = true;
                        } else if (value1) {
                            combinedEntityData[varName] = value1;
                        } else if (value2) {
                            combinedEntityData[varName] = value2;
                        } else {
                            combinedEntityData[varName] = null;
                        }
                    });

                    if (isDuplicate) {
                        console.warn("Duplicate values detected on the same axis!");
                    }
                    else {
                        deleteEntities([
                            connectedEntity1["id"],
                            connectedEntity2["id"],
                        ]);
                        addEntities([combinedEntityData]);
                        console.log("Combined entity: ", combinedEntityData);
                    }

                    // Reset connectedPoint after combining
                    d3.selectAll(".entity-dot").classed("connect-entity-dot", false);

                    connectedPoint = null;
                }
                else {
                    connectedPoint = {
                        entityId: clickEntityId,
                        axis: clickAxis,
                    };
                    console.log("Set connected point: ", connectedPoint);
                }
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
            const selectedSingleEntities = [];
            const selectedConnectedEntities = [];

            svg.selectAll(".entity-path").each(function (d) {
                if (d) {
                    // Should applicable for entities that have values in all selected regions and the entities that are single but within the selected regions
                    const active = Array.from(selections).every(([key, [max, min]]) => d[key] >= min && d[key] <= max);
                    const isSingleActive = Array.from(selections).every(([key, [max, min]]) => d[key] === null || (d[key] >= min && d[key] <= max));
                    if (active) {
                        d3.select(this).classed("brush-selection", true);
                        d3.select(this).classed("brush-non-selection", false);
                        d3.select(this).raise();
                        selectedConnectedEntities.push(d);
                    }
                    else {
                        d3.select(this).classed("brush-selection", false);
                        d3.select(this).classed("brush-non-selection", true);
                    }
                }
            });

            svg.selectAll(".entity-dot")
                .raise();

            svg.node().value = selectedConnectedEntities;
            svg.dispatch("input");
            setBrushSelectedRegions(selections);
        }

        svg.node().value = Object.values(entities);

        svg.on("input", function () {
            const selectedEntities = svg.node().value;
            setSelectedEntities(selectedEntities);
            synchronizeSankeySelection(selectedEntities);
        });

        svg.selectAll(".axis")
            .call(brush)
            .call(brush.move, null) // Clear the brush selection
    }


    const linkEntitiesInRegion = () => {
        if (activeInteraction === INTERACTION_TYPES.SELECTION) {
            generateRandomEntities();
        }
        else if (activeInteraction === INTERACTION_TYPES.CONNECT) {
            connectRandomEntities();
        }
    }

    const connectRandomEntities = () => {
        console.log("Connect random entities", selectedEntities);

    }

    // Randomly populate data points in the selected region
    const generateRandomEntities = () => {
        const newEntitiesNum = 10;
        const newEntitiesData = [];
        for (let i = 0; i < newEntitiesNum; i++) {
            let entityData = {};
            Array.from(brushSelectedRegions).forEach(([varName, range]) => {
                const [min, max] = range;
                const randomValue = Math.random() * (max - min) + min;
                entityData[varName] = randomValue;
            });
            console.log("New entity data: ", entityData);
            newEntitiesData.push(entityData);
        }

        addEntities(newEntitiesData);
    }

    const deleteSelectedEntities = () => {
        deleteEntities(selectedEntities.map(entity => entity.id));
    }

    const changeFilterType = (filter) => {
        console.log("change filter type to ", filter);

        // Double click to clear the filter
        if (filter === activeFilter) {
            const svg = d3.select("#sankey-svg");
            svg.selectAll(".entity-path").classed("brush-selection", true);
            svg.selectAll(".entity-path").classed("brush-non-selection", false);
            svg.selectAll(".entity-dot").classed("unselected-entity-dot", false);

            const newAxesFilterStatus = {};
            Object.keys(variablesDict).forEach(axis => {
                newAxesFilterStatus[axis] = false;
            });
            setAxesFilterStatus(newAxesFilterStatus);

            setActiveFilter(null);
            svg.node().value = Object.values(entities);
            svg.dispatch("input");
        }
        else {
            if (filter !== FILTER_TYPES.PARTIALLY) {
                const newAxesFilterStatus = {};
                Object.keys(variablesDict).forEach(axis => {
                    newAxesFilterStatus[axis] = false;
                });
                setAxesFilterStatus(newAxesFilterStatus);
            }
            filterEntities(filter);
        }
    }

    const filterEntities = (filter) => {
        const svg = d3.select("#sankey-svg");

        const highlightedItems = [];
        svg.selectAll(".entity-path").each(function (d) {
            if (d) {
                switch (filter) {
                    case FILTER_TYPES.FULLY:
                        // Filter out the fully connected entities
                        const isFullyConnected = sortableVariables.every(variable => d[variable.name] !== null);
                        changeFilteredEntitiesStyle(this, d, isFullyConnected, highlightedItems);
                        break;
                    case FILTER_TYPES.PARTIALLY:
                        // Filter out the partially connected entities
                        const filterOutAxes = Object.entries(axesFilterStatus).filter(([key, value]) => !value).map(([key]) => key);
                        const filteredInAxes = Object.entries(axesFilterStatus).filter(([key, value]) => value).map(([key]) => key);
                        const isPartiallyConnected = filteredInAxes.length > 0 && filteredInAxes.every(axisName => d[axisName] !== null) && filterOutAxes.every(axisName => d[axisName] === null);
                        changeFilteredEntitiesStyle(this, d, isPartiallyConnected, highlightedItems);
                        break;
                    case FILTER_TYPES.NONE:
                        // Filter out the entities that are completely not connected
                        const isNoneConnected = sortableVariables.filter(variable => d[variable.name] !== null).length === 1;
                        changeFilteredEntitiesStyle(this, d, isNoneConnected, highlightedItems);
                        break;
                    default:
                        break;
                }
            }
        })

        svg.node().value = highlightedItems;
        svg.dispatch("input");

        setActiveFilter(filter);
    }

    const changeFilteredEntitiesStyle = (htmlItem, entity, isFilteredIn, highlightedItems) => {
        if (isFilteredIn) {
            d3.select(htmlItem).classed("brush-selection", true);
            d3.select(htmlItem).classed("brush-non-selection", false);
            d3.select(htmlItem).raise();
            highlightedItems.push(entity);
            // Highlight the dots that are filtered in
            Object.entries(entity).forEach(([key, value]) => {
                if (key !== "id" && value !== null) {
                    d3.select(`#dot_${entity["id"]}_${key}`).classed("selected-entity-dot", true);
                    d3.select(`#dot_${entity["id"]}_${key}`).classed("unselected-entity-dot", false);
                    d3.select(`#dot_${entity["id"]}_${key}`).raise();
                }
            });
        }
        else {
            d3.select(htmlItem).classed("brush-selection", false);
            d3.select(htmlItem).classed("brush-non-selection", true);
            // De-Highlight the dots that are not filtered in
            Object.entries(entity).forEach(([key, value]) => {
                if (key !== "id" && value !== null) {
                    d3.select(`#dot_${entity["id"]}_${key}`).classed("unselected-entity-dot", true);
                    d3.select(`#dot_${entity["id"]}_${key}`).classed("selected-entity-dot", false);
                }
            });
        }
    }

    const handleDragStart = (event) => {
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


    function toggleAxesFilter(event) {
        const axisName = event.target.value;
        setAxesFilterStatus(prevStatus => ({
            ...prevStatus,
            [axisName]: !prevStatus[axisName]
        }));
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    return (
        <Box>
            <Box sx={{ my: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                    <FormControl
                        component="fieldset"
                        sx={{
                            border: '1px solid',
                            borderColor: 'grey.500',
                            borderRadius: 1,
                            p: 1
                        }}
                    >
                        <FormLabel component="legend">Show Entities that connected </FormLabel>
                        <RadioGroup
                            row
                            aria-label="filterType"
                            name="filterType"
                            value={activeFilter || ""}
                            onClick={(event) => changeFilterType(event.target.value)}
                        >
                            {Object.values(FILTER_TYPES).map(type => (
                                <FormControlLabel key={type} value={type} control={<Radio />} label={type} />
                            ))}
                        </RadioGroup>
                    </FormControl>

                    <FormControl
                        component="fieldset"
                        sx={{
                            border: '1px solid',
                            borderColor: 'grey.500',
                            borderRadius: 1,
                            p: 2,
                            ml: 2
                        }}
                    >
                        <FormLabel component="legend">Manipulate Data by</FormLabel>
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

                    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', ml: 2 }}>
                        <Box sx={{ mx: 2, display: 'flex', flexDirection: 'column', alignContent: 'center' }}>
                            <Button
                                sx={{ my: 1 }}
                                disabled={brushSelectedRegions.size === 0 || activeInteraction !== INTERACTION_TYPES.SELECTION}
                                variant='outlined'
                                onClick={generateRandomEntities}>
                                Generate
                            </Button>
                            <Button
                                disabled={selectedEntities.length === 0 || activeInteraction !== INTERACTION_TYPES.SELECTION}
                                variant='outlined'
                                onClick={connectRandomEntities}>
                                Link
                            </Button>
                        </Box>

                        <Button
                            disabled={selectedEntities.length === 0}
                            variant='outlined'
                            onClick={deleteSelectedEntities}>
                            Delete
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ width: "100%", display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext
                        items={sortableVariables}
                        strategy={verticalListSortingStrategy}
                    >
                        <Box sx={{ width: '100%', minHeight: '40px', display: 'flex', flexDirection: 'row', position: 'relative' }}>
                            {sortableVariables.map(item => {
                                const axisPosition = variableAxesRef.current(item.name) - labelOffset;

                                return (
                                    <SortableItem
                                        key={item.name}
                                        id={item.name}
                                        axesFilterStatus={axesFilterStatus}
                                        toggleAxesFilter={toggleAxesFilter}
                                        axisPosition={axisPosition}
                                        activeFilter={activeFilter}
                                    />
                                )
                            })}
                        </Box>
                    </SortableContext>
                    <DragOverlay>
                        {draggedItem ? <Item id={draggedItem} /> : null}
                    </DragOverlay>
                </DndContext>

                <Box sx={{ width: "100%", mx: 'auto', mt: 1 }} id='sankey-div'></Box>
            </Box>
        </Box >
    )
}

export const SortableItem = forwardRef(({ id, axesFilterStatus, toggleAxesFilter, axisPosition, activeFilter }, ref) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id, });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Item
            ref={setNodeRef}
            id={id}
            axesFilterStatus={axesFilterStatus}
            toggleAxesFilter={toggleAxesFilter}
            axisPosition={axisPosition}
            activeFilter={activeFilter}
            style={style}
            {...attributes}
            {...listeners}
        />
    );
});

export const Item = forwardRef(({ id, axesFilterStatus, toggleAxesFilter, axisPosition, activeFilter, ...props }, ref) => {

    return (
        <Box {...props}
            ref={ref}
            sx={{
                display: 'block flex', flexDirection: 'column', alignItems: 'center',
                left: axisPosition, position: 'absolute'
            }}
        >
            <DragHandleIcon />
            <Typography>{id}</Typography>
            <Radio
                size='small'
                sx={{ padding: "2px" }}
                disabled={activeFilter !== FILTER_TYPES.PARTIALLY}
                checked={axesFilterStatus ? axesFilterStatus[id] : false}
                value={id}
                onClick={(event) => toggleAxesFilter(event)}
            />
        </Box>
    )
});