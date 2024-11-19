import { Config } from "jest";

const jestConfig: Config = {
    modulePathIgnorePatterns: ["<rootDir>/.w3nest", "<rootDir>/dist"],
};
export default jestConfig;
