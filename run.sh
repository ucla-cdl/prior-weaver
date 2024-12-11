#!/bin/bash
npm start & # Start frontend server
uvicorn main:app --reload # Start backend server