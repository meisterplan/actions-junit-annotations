# actions-junit-annotations
Annotate JUnit XML build results on GitHub Actions build

## Minimal example
```
    - uses: meisterplan/actions-junit-annotations@master
      if: always()
      with:
        access-token: ${{ secrets.GITHUB_TOKEN }}
``` 

**TODO** List all possible parameters
   
