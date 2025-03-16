import React, { createContext, useEffect, useState } from 'react';

export const WorkspaceContext = createContext();

export const TASK_SETTINGS = {
    "growth": {
        id: "growth",
        name: "Human Growth Prediction",
        scenario: "During the early stages of life the stature of female and male are about the same,\
                but their stature start to clearly to differ during growth and in the later stages of life.\
                In the early stage man and female are born roughly with the same stature, around 45cm - 55cm.\
                By the time they are born reaching around 2.5 years old, both male and female present the highest growth rate (centimetres pey year).\
                It is the time they grow the fastest. During this period, man has higher growth rate compared to female.\
                For both male and female there is a spurt growth in the pre-adulthood.\
                For man, this phase shows fast growth rate varying in between 13-17 years old and female varying from 11-15.\
                Also, male tend to keep growing with roughly constant rate until the age of 17-18, while female with until the age of 15-16.\
                After this period of life they tend to stablish their statures mostly around 162 - 190cm and 155 - 178cm respectively.",
        defaultModel: `model <- glm(height ~ age, family = binomial(link = "logit"))`,
    },
    "income": {
        id: "income",
        name: "Income Prediction",
        scenario: "Imagine you are a social scientist interested in understanding the factors that influence people's income.\
                Specifically, you want to assess how the number of years of education and a person's age (or employment years) impact their monthly income in the U.S.\
                You aim to use this information to better understand socioeconomic patterns and inform policy recommendations.",
        defaultModel: `model <- glm(income ~ age + education, family = binomial(link = "logit"))`
    }
}

export const CONDITIONS = {
    PARAMETER: "Parameter Space",
    OBSERVABLE: "Observable Space"
}

export const WorkspaceProvider = ({ children }) => {
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    const [task, setTask] = useState(TASK_SETTINGS["income"]);
    const [model, setModel] = useState('');
    const [condition, setCondition] = useState(CONDITIONS.OBSERVABLE);

    const [finishParseModel, setFinishParseModel] = useState(false);

    useEffect(() => {
        if (task) {
            setModel(task.defaultModel);
        }
    }, [task]);

    const contextValue = {
        finishParseModel,
        setFinishParseModel,
        leftPanelOpen,
        setLeftPanelOpen,
        rightPanelOpen,
        setRightPanelOpen,
        task,
        setTask,
        model,
        setModel,
        condition,
        setCondition
    };

    return (
        <WorkspaceContext.Provider value={contextValue}>
            {children}
        </WorkspaceContext.Provider>
    );
}; 