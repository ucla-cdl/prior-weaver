import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { TASK_SETTINGS, WorkspaceContext } from './WorkspaceContext';
import axios from 'axios';

export const VariableContext = createContext();

const DEFAULT_VARIABLE_ATTRIBUTES = {
    min: 0,
    max: 100,
    binCount: 10,
};

const DEFAULT_PARAMETER_ATTRIBUTES = {
    min: -2,
    max: 2,
    binCount: 10,
    roulettePoints: [],
    distributions: [],
    selectedDistributionIdx: null,
};

export const DISTRIBUTION_TYPES = {
    'uniform': 'Uniform',
    'norm': 'Normal',
    't': 'Student-t',
    'gamma': 'Gamma',
    'beta': 'Beta',
    'skewnorm': 'Skew Normal',
    'lognorm': 'Log Normal',
    'loggamma': 'Log Gamma',
    'expon': 'Exponential',
};

export const VariableProvider = ({ children }) => {
    const { taskId, model, setModel, finishParseModel, setFinishParseModel, savedEnvironment, setFinishFetchingStudySettings } = useContext(WorkspaceContext);
    const [variablesDict, setVariablesDict] = useState({});
    const sortableVariablesRef = useRef([]);
    const [parametersDict, setParametersDict] = useState({});
    const [biVariablesPairs, setBiVariablesPairs] = useState([]);
    const [translationTimes, setTranslationTimes] = useState(0);
    const [predictiveCheckResults, setPredictiveCheckResults] = useState([]);

    // Load variables and parameters from saved environment if available
    useEffect(() => {
        if (savedEnvironment) {
            console.log("saved environment", savedEnvironment);
            setVariablesDict(savedEnvironment.variablesDict);
            setParametersDict(savedEnvironment.parametersDict);
            setTranslationTimes(savedEnvironment.translationTimes);
            setPredictiveCheckResults(savedEnvironment.predictiveCheckResults);

            console.log("Loaded variables and parameters from saved environment.");
        }
    }, [savedEnvironment]);

    useEffect(() => {
        const sortedVars = Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum);
        sortableVariablesRef.current = sortedVars;
        // Generate all pairs of variables in the required order
        let bivariatePairs = [];
        for (let i = 0; i < sortedVars.length - 1; i++) {
            for (let j = i + 1; j < sortedVars.length; j++) {
                bivariatePairs.push([sortedVars[i].name, sortedVars[j].name]);
            }
        }
        setBiVariablesPairs(bivariatePairs);
    }, [variablesDict]);

    // Add a new variable
    const addVariable = (data) => {
        updateVariable(data.name, data);

        const paramName = data.name;
        updateParameter(paramName, {
            name: paramName,
            relatedVar: data.name,
            ...DEFAULT_PARAMETER_ATTRIBUTES
        });
    };

    // Update the variable
    const updateVariable = (name, updates) => {
        let finalUpdates = { ...updates };

        // If min or max is updated, recalculate bin edges
        if ('min' in updates || 'max' in updates || 'binCount' in updates) {
            const currentVar = variablesDict[name] || {};
            const newMin = updates.min ?? currentVar.min;
            const newMax = updates.max ?? currentVar.max;
            const binCount = updates.binCount ?? currentVar.binCount;

            // Create 10 equally spaced bins
            const step = (newMax - newMin) / binCount;
            const binEdges = Array.from({ length: binCount + 1 }, (_, i) => newMin + step * i);

            finalUpdates.binEdges = binEdges;
        }

        console.log("update variable", name, finalUpdates);
        setVariablesDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...finalUpdates }
        }));
    }

    // Update the parameter
    const updateParameter = (name, updates) => {
        let finalUpdates = { ...updates };

        // If min or max is updated, recalculate bin edges
        if ('min' in updates || 'max' in updates || 'binCount' in updates) {
            const currentParameter = parametersDict[name] || {};
            const newMin = updates.min ?? currentParameter.min;
            const newMax = updates.max ?? currentParameter.max;
            const binCount = updates.binCount ?? currentParameter.binCount;

            // Create binCount equally spaced bins
            const step = (newMax - newMin) / binCount;
            const binEdges = Array.from({ length: binCount + 1 }, (_, i) => newMin + step * i);

            finalUpdates.binEdges = binEdges;
        }

        console.log("update parameter", name, finalUpdates);
        setParametersDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...finalUpdates }
        }));
    }

    const parseVariables = () => {
        if (savedEnvironment) {
            setFinishParseModel(true);
            setFinishFetchingStudySettings(false);
            return;
        };

        const variables = TASK_SETTINGS[taskId].variables;
        let index = 0;
        Object.entries(variables).forEach(([type, vars]) => {
            if (type === "response") {
                updateVariable(vars[0].name, {
                    name: vars[0].name,
                    type: type,
                    unitLabel: vars[0].unit,
                    sequenceNum: index,
                    ...DEFAULT_VARIABLE_ATTRIBUTES
                });
                index++;
            }
            else if (type === "predictor") {
                vars.forEach((v) => {
                    addVariable({
                        name: v.name,
                        type: type,
                        unitLabel: v.unit,
                        sequenceNum: index,
                        ...DEFAULT_VARIABLE_ATTRIBUTES
                    });
                    index++;
                });
            }
        });

        // Add Extra parameters
        updateParameter('intercept', {
            name: 'intercept',
            relatedVar: 'intercept',
            ...DEFAULT_PARAMETER_ATTRIBUTES
        });

        setFinishParseModel(true);
        setFinishFetchingStudySettings(false);
    }

    // Parse the model in R code
    const handleParseModel = () => {
        if (savedEnvironment) {
            setFinishParseModel(true);
            return;
        };

        axios.post(window.BACKEND_ADDRESS + '/getStanCodeInfo', {
            code: model
        })
            .then((response) => {
                const codeInfo = response.data.code_info;
                /**
                 * Parse GLM code
                 * 
                 * Format:
                 * {
                 *  'code': 'model <- glm(outcome ~ age + gender, family = binomial(link = "logit"))',
                 *  'formula': 'outcome ~ age + gender', 
                 *  'response': 'outcome', 
                 *  'predictors': ['age', 'gender'], 
                 *  'family': 'binomial', 
                 *  'link': 'logit'
                 * }
                 */
                Object.entries(codeInfo).forEach(([section, sectionInfo]) => {
                    switch (section) {
                        case "response":
                            updateVariable(sectionInfo, {
                                name: sectionInfo,
                                type: "response",
                                unitLabel: "",
                                sequenceNum: 0,
                                ...DEFAULT_VARIABLE_ATTRIBUTES
                            });
                            break;
                        case "predictors":
                            sectionInfo.forEach((predictor, index) => {
                                addVariable({
                                    name: predictor,
                                    type: "predictor",
                                    unitLabel: "",
                                    sequenceNum: index + 1,
                                    ...DEFAULT_VARIABLE_ATTRIBUTES
                                });
                            });
                            break;
                        case "code":
                            setModel(sectionInfo);
                            break;
                        default:
                            break;
                    }
                });

                // Add Extra parameters
                updateParameter('intercept', {
                    name: 'intercept',
                    relatedVar: 'intercept',
                    ...DEFAULT_PARAMETER_ATTRIBUTES
                });
            })
            .finally(() => {
                setFinishParseModel(true);
            })
            .catch((error) => {
                console.log(error);
            });
    }

    const getDistributionNotation = (dist) => {
        const params = dist.params;
        switch (DISTRIBUTION_TYPES[dist.name]) {
            case DISTRIBUTION_TYPES.uniform:
                return `X ~ Uniform(a = ${params.loc}, b = ${(params.loc + params.scale).toFixed(2)})`;
            case DISTRIBUTION_TYPES.norm:
                return `X ~ Normal(μ = ${params.loc}, σ = ${params.scale})`;
            case DISTRIBUTION_TYPES.t:
                return `X ~ Student-t(ν = ${params.df}, μ = ${params.loc}, σ = ${params.scale})`;
            case DISTRIBUTION_TYPES.gamma:
                return `X ~ Gamma(α = ${params.a}, β = ${(1 / params.scale).toFixed(2)})`;
            case DISTRIBUTION_TYPES.beta:
                return `X ~ Beta(${params.a}, ${params.b}, loc = ${params.loc}, scale = ${params.scale})`;
            case DISTRIBUTION_TYPES.skewnorm:
                return `X ~ Skew Normal(μ = ${params.loc}, σ = ${params.scale}, α = ${params.a})`;
            case DISTRIBUTION_TYPES.lognorm:
                return `X ~ Log-Normal(μ = ${Math.log(params.scale).toFixed(2)}, σ = ${params.s})`;
            case DISTRIBUTION_TYPES.loggamma:
                return `X ~ Log-Gamma(α = ${Math.log(params.scale).toFixed(2)}, β = ${params.c})`;
            case DISTRIBUTION_TYPES.expon:
                return `X ~ Exponential(λ = ${(1 / params.scale).toFixed(2)})`;
            default:
                return `Unknown distribution`;
        }
    }

    const contextValue = {
        variablesDict,
        setVariablesDict,
        parametersDict,
        setParametersDict,
        updateParameter,
        biVariablesPairs,
        setBiVariablesPairs,
        addVariable,
        updateVariable,
        handleParseModel,
        parseVariables,
        DEFAULT_VARIABLE_ATTRIBUTES,
        sortableVariablesRef,
        translationTimes,
        setTranslationTimes,
        predictiveCheckResults,
        setPredictiveCheckResults,
        getDistributionNotation,
    };

    return (
        <VariableContext.Provider value={contextValue}>
            {children}
        </VariableContext.Provider>
    );
}; 