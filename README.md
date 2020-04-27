# actions-junit-annotations
Annotate JUnit XML build results on GitHub Actions build

## Minimal example
```
    - uses: meisterplan/actions-junit-annotations@master
      if: always()
      with:
        access-token: ${{ secrets.GITHUB_TOKEN }}
``` 

### Optional parameters
- `projectPath`: Path to the server project to be analyzed, default `service/server`
- `junitSubPath`: Glob path to JUnit XML files inside project, default `build/test-results/test/*.xml`
- `testSrcSubPath`: Path to test source files inside project, default `src/test/kotlin/`
- `maxFailures`: Maximum amount of failed tests to include, default 10
- `jobName`: Partial match of job name to annotate in this workflow, default `test-server`