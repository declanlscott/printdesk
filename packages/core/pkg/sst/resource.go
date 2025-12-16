package sst

import (
	"fmt"
	"log"
	"strings"

	"github.com/sst/sst/v3/sdk/golang/resource"
)

type PathError struct {
	Path []string
	Err  error
}

func (e *PathError) Error() string {
	return fmt.Sprintf("%s: %s", strings.Join(e.Path, "."), e.Err.Error())
}

func Resource[TValue any](path ...string) (TValue, error) {
	var zero TValue

	val, err := resource.Get(path...)
	if err != nil {
		log.Printf("failed to get reosurce: %s", err.Error())
		return zero, &PathError{Path: path, Err: err}
	}

	casted, ok := val.(TValue)
	if !ok {
		err := fmt.Errorf("reosurce type assertion failed")
		log.Printf("%s", err)
		return zero, &PathError{Path: path, Err: err}
	}

	return casted, nil
}
