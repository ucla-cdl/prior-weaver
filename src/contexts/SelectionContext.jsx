import React, { createContext, useContext, useRef, useState } from "react";
import { VariableContext } from "./VariableContext";

export const SelectionContext = createContext();

export const SELECTION_SOURCES = {
    PARALLEL: "parallel",
    BIVARIATE: "bivariate"
};

export const FILTER_TYPES = {
    COMPLETE: "complete",
    INCOMPLETE: "incomplete"
}

export const SelectionProvider = ({ children }) => {    
    const { variablesDict } = useContext(VariableContext);

    const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.COMPLETE);
    const [selections, setSelections] = useState(new Map());
    const [selectionSource, setSelectionSource] = useState(null);
    const selectionsRef = useRef(new Map());
    const [selectedEntities, setSelectedEntities] = useState([]);
    const [potentialEntities, setPotentialEntities] = useState([]);

    const updateSelections = (newSelections, source) => {
        setSelectionSource(source);
        setSelections(newSelections);
    };

    const isHidden = (entity) => {
        const isComplete = Object.values(variablesDict).every(variable => entity[variable.name] !== null && entity[variable.name] !== undefined);

        // COMPLETE mode: hide incomplete entities
        if (activeFilter === FILTER_TYPES.COMPLETE) {
            return !isComplete;
        } 
        // INCOMPLETE mode: hide complete entities
        else if (activeFilter === FILTER_TYPES.INCOMPLETE) {
            return isComplete;
        }
    }

    const contextValue = {
        FILTER_TYPES,
        SELECTION_SOURCES,
        activeFilter,
        setActiveFilter,
        selectedEntities,
        setSelectedEntities,
        selections,
        updateSelections,
        selectionSource,
        isHidden,
        selectionsRef,
        potentialEntities,
        setPotentialEntities
    }

    return (
        <SelectionContext.Provider value={contextValue}>
            {children}
        </SelectionContext.Provider>
    );
}   