import { createContext, useState } from "react";

export const PriorContext = createContext();

export const PriorProvider = ({ children }) => {
    const [priorsDict, setPriorsDict] = useState({});

    const updatePrior = (name, distribution) => {
        setPriorsDict({ ...priorsDict, [name]: distribution });
    }

    const contextValue = {
        priorsDict,
        setPriorsDict,
        updatePrior
    }

    return (
        <PriorContext.Provider value={contextValue}>
            {children}
        </PriorContext.Provider>
    )
}
