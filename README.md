# PriorWeaver: Iterative Construction of Bayesian Priors
> [Check the webpage for detailed videos and user interfaces](https://ucla-cdl.github.io/prior-weaver/).

A central aspect of Bayesian analysis is incorporating **prior knowledge**—assumptions about the modeled domain before observing data. Formally, this knowledge is represented as **prior distributions** (or simply, priors), which define probability distributions over model parameters. However, specifying priors can be challenging, as it requires domain expertise that statisticians may not always possess.

One approach to addressing this challenge is prior elicitation, where statisticians work with domain experts to (1) gather their domain knowledge and (2) translate it into probability distributions, (3) ultimately selecting an appropriate prior.

Conversely, domain experts who wish to apply their knowledge in Bayesian analysis may find it difficult to conduct prior elicitation independently without the help from statisticians.

To bridge this gap, we introduce **PriorWeaver**, an interactive system designed to help domain experts express their knowledge and derive appropriate prior distributions for Bayesian models. PriorWeaver makes prior elicitation more accessible, facilitating collaboration between statisticians and domain experts while ensuring that domain knowledge is effectively integrated into Bayesian models.

## Table of Contents

- [Installation](#installation)
- [Libraries](#libraries)
- [License](#license)

## Installation

The node and npm version used in the developent are as follows:
```bash
node = v21.2.0
npm = 10.8.3
```

To get a local copy up and running, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/ucla-cdl/prior-weaver.git
   ```

2. Navigate into the project directory and install the frontend dependencies:
   ```bash
   npm install
   ```

4. Install the backend dependencies with anaconda virtual environment:
   ```bash
   conda env create -f environment.yml
   conda activate prior-weaver
   ```

5. Start the server:
   ```bash
   sh run.sh
   ```

   The web interface will be running at `http://localhost:3000` and the backend will be running at `http://localhost:8000`.


<!-- ## Features

### Three-stage Scaffold
Users are offered three modules that correspond to three levels of abstraction in the prior elicitation process (i.e., conceptual model, bivariate relationship, and univariate distribution).

[Figure: conceptual model -> bivariate -> marginal]

### Flexible and Iterative Specification
Users are able to freely navigate between different stages of the specification process, making adjustments and assumptions in a non-linear manner. 

### Direct Manipulation
Users can modify distrbutions by simple interactions, such as draging and clicking.

### Mapping of User Intentions to Specifications
[WIP] -->

## Libraries

- [React](https://reactjs.org/)
- [D3.js](https://www.d3js.org)
- [FastAPI](https://fastapi.tiangolo.com)
- [Fitter](https://fitter.readthedocs.io/en/latest/index.html)

<!-- 
## Usage

### Adding a Variable
Click `Add Variable` to add a new variable in your analysis by specifying the `name` and `range` of this variable.

### Adding a Causal Relationship
Click `Add Relation` to add a new causal relation between two variables.

### Specifying a Bivariate Relationship
After choosing two variables using the selector, a bivariate plot would be automatically generated. There are three modes you could select:

- Predict: Add a anchor point that draws up a trend line.
- Populate: Add a data point. 
- Chip: Add a data point by allocating two available "chips" from the marginal plot.

### Specifying a Univariate Relationship
Drag and drop the toggle point on each bin to adjust the histogram.

### Choose an Appropriate Distribution
Click `Fit Distribution` to automatically fit the discrete histogram data to possible distributions. The available distrbutions will be shown on the panel right next to the univariate plot, click `Show` to inspect the distribution and click `Select` to pick.    -->


## License

Distributed under the MIT License. See `LICENSE` for more information. -->

---
