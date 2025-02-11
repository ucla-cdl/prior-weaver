from fastapi import FastAPI, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from concurrent.futures.process import ProcessPoolExecutor
from pydantic import BaseModel
from typing import List, Dict

import numpy as np
import re
import scipy.stats as stats
from fitter import Fitter

import pandas as pd
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    print("Backend is ready")


@app.on_event("shutdown")
def shutdown_db_client():
    print("Backend is shut down")


@app.get('/')
def root():
    print("checking root")
    return {"message": "Hello World!"}


class StanCodeRequest(BaseModel):
    code: str


@app.post('/getStanCodeInfo')
def parse_stan_code(request: StanCodeRequest):
    parsed_res = parse_glm_code(request.code)
    return {
        "code_info": parsed_res
    }


def parse_glm_code(code):
    # Define the pattern to match the glm formula and components
    formula_pattern = r"glm\s*\((.*?)\,\s*"
    family_pattern = r"family\s*=\s*([a-zA-Z]+)"
    link_pattern = r"link\s*=\s*\"?([a-zA-Z]+)\"?"

    # Extract the glm formula (inside the glm() function)
    formula_match = re.search(formula_pattern, code)
    if not formula_match:
        raise ValueError("No glm formula found in the code.")
    
    formula = formula_match.group(1).strip()
    
    # Parse the response and predictors from the formula
    formula_parts = formula.split("~")
    if len(formula_parts) != 2:
        raise ValueError("Invalid glm formula structure.")
    
    response = formula_parts[0].strip()
    predictors = formula_parts[1].strip()
    predictors = [pred.strip() for pred in predictors.split("+")]

    # Extract family and link function using the patterns
    family_match = re.search(family_pattern, code)
    link_match = re.search(link_pattern, code)

    family = family_match.group(1) if family_match else None
    link = link_match.group(1) if link_match else None

    return {
        "code": code,
        "formula": formula,
        "response": response,
        "predictors": predictors,
        "family": family,
        "link": link
    }


def parse_stan_code(code):
    block_patterns = {
        "data": r"data\s*{([^}]*)}",
        "parameters": r"parameters\s*{([^}]*)}",
        "model": r"model\s*{([^}]*)}",
    }

    def parse_block(block):
        """Parse a block and return detailed information for each variable."""
        if not block:
            return []
        lines = block.strip().split("\n")
        variables = []

        for line in lines:
            line = line.strip().replace(";", "")  # Remove semicolons
            parts = re.split(r"\s+", line)
            if len(parts) >= 2:
                var_type = parts[0]  # First part is the type (e.g., real, int)
                var_name = parts[-1]  # Last part is the variable name

                variables.append({
                    "name": var_name,
                    "full_declaration": line
                })

        return variables

    # Extract and parse each block
    result = {}
    for block_name, pattern in block_patterns.items():
        match = re.search(pattern, code, re.DOTALL)
        result[block_name] = parse_block(match.group(1)) if match else []

    return result


class BiVariableData(BaseModel):
    populateDots: List[dict]
    chipDots: List[dict]


@app.post('/fitBiVarRelation')
def fit_bi_var_relation(data: BiVariableData = Body(...)):
    dots = data.populateDots + data.chipDots
    df = pd.DataFrame(dots)

    X = df[['x']]
    y = df['y']

    # Polynomial Regression
    degree = 2  # Set degree for non-linearity
    poly = PolynomialFeatures(degree=degree)
    X_poly = poly.fit_transform(X)

    model = LinearRegression()
    model.fit(X_poly, y)

    # Predict values for the given range of x (for smooth plotting)
    x_range = pd.DataFrame(
        {'x': range(int(min(df['x'])), int(max(df['x'])) + 1)})
    X_poly_range = poly.fit_transform(x_range)
    predictions = model.predict(X_poly_range)

    # Prepare the response
    response_data = {
        'fittedLine': [{'x': x_val, 'y': y_pred} for x_val, y_pred in zip(x_range['x'], predictions)],
        'equation': f'y = {model.coef_[1]:.2f} * x^1 + {model.coef_[2]:.2f} * x^2 + {model.intercept_:.2f}'
    }

    print("bivariate relation fitted", response_data['equation'])
    return response_data


class TranslationData(BaseModel):
    entities: List[dict]
    variables: List[dict]


@app.post('/translate')
def translate(data: TranslationData = Body(...)):
    print("translation started")
    entities = data.entities
    variables = data.variables

    # Dynamically determine predictors and response variable
    variable_names = [var["name"] for var in variables]
    # Treat the last variable as the response
    response_var = variable_names[-1]
    predictors = variable_names[:-1]  # Remaining variables are predictors

    # Convert dataset to NumPy arrays
    dataset = np.array([
        [entity[var_name] for var_name in variable_names]
        for entity in entities
    ])
    X = dataset[:, :-1]  # Predictor variables
    y = dataset[:, -1]   # Response variable

    # Sampling and fitting
    num_samples = 100
    n_records = len(entities)
    parameter_samples = {var: [] for var in predictors}  # Store coefficients
    intercept_samples = []

    for _ in range(num_samples):
        # Bootstrap sampling
        indices = np.random.choice(n_records, n_records, replace=True)
        X_sample = X[indices]
        y_sample = y[indices]

        # Fit linear model
        model = LinearRegression()
        model.fit(X_sample, y_sample)

        # Store parameter estimates
        for i, var in enumerate(predictors):
            parameter_samples[var].append(model.coef_[i])
        intercept_samples.append(model.intercept_)

    # Prepare the response
    parameter_samples["intercept"] = intercept_samples
    print("translation done")

    # Convert samples to distributions
    fitted_distributions = convert_samples_to_distribution(parameter_samples)
    print("distribution converted")

    return {
        "parameter_distributions": parameter_samples,
        "fitted_distributions": fitted_distributions
    }


def convert_samples_to_distribution(parameter_samples):
    fit_dists = {}
    for param, samples in parameter_samples.items():
        fit_dists[param] = {}

        f = Fitter(samples, distributions=[
            'norm', 'expon', 'lognorm', 'gamma', 'beta', 'uniform'])
        f.fit()

        # Generate x values for plotting the PDF of the fitted distributions
        x = np.linspace(min(samples), max(samples), 1000)

        sum = f.summary(plot=False)

        dist_cnt = 0
        idx = 0
        while dist_cnt < 3:
            fit_name = sum.iloc[idx].name
            fit_params = f.fitted_param[fit_name]
            fit_distribution = getattr(stats, fit_name)
            param_names = (fit_distribution.shapes + ", loc, scale").split(
                ", ") if fit_distribution.shapes else ["loc", "scale"]

            fit_params_dict = {}
            for d_key, d_val in zip(param_names, fit_params):
                if not np.isnan(d_val) and not np.isinf(d_val):
                    fit_params_dict[d_key] = float(f"{d_val:.4f}")
                else:
                    print("invalid param: ", d_key, " = ", d_val)

            p = get_fit_var_pdf(x, fit_name, fit_params_dict)

            metrics = {}
            sum_row = sum.loc[fit_name]
            for col_label in sum.columns:
                if not np.isnan(sum_row[col_label]) and not np.isinf(sum_row[col_label]):
                    metrics[col_label] = float(f"{sum_row[col_label]:.4f}")

            if np.isnan(p).any() or np.isinf(p).any() or np.isnan(x).any() or np.isinf(x).any():
                print("invalid distribution: ", fit_name)
                idx += 1
                continue

            fit_dists[param][fit_name] = {
                'name': fit_name,
                'params': fit_params_dict,
                'x': x.tolist(),
                'p': p.tolist(),
                'metrics': metrics
            }

            dist_cnt += 1
            idx += 1
            print("distribution fitted: ", fit_name)

    return fit_dists


def get_fit_var_pdf(x, fit_name, fit_params):
    # Get the distribution function from scipy.stats based on fit_name
    dist = getattr(stats, fit_name)

    # Pass the keyword arguments dynamically based on the provided fit_params
    p = dist.pdf(x, **fit_params)

    return p



def prior_predictive_check(fitted_distributions, num_samples=1000):
    # Extract fitted parameters for alpha, beta, and sigma
    parameter_samples = []
    for param, dists in fitted_distributions.items():
        dist = list(dists.values())[0]
        samples = getattr(stats, dist['name']).rvs(**dist["params"], size=num_samples)
        
    # Simulate age and education data (prior predictive range)
    age_range = np.linspace(20, 60, 50)  # Replace with actual prior range for age
    education_range = np.linspace(8, 20, 50)  # Replace with actual prior range for education

    simulated_incomes = []
    for age in age_range:
        for edu in education_range:
            alpha = np.random.choice(alpha_samples)
            beta = np.random.choice(beta_samples)
            sigma = np.random.choice(sigma_samples)
            
            # Simulate income using the prior model
            income = alpha * age + beta * edu + sigma
            simulated_incomes.append(income)
    