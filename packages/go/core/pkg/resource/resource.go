package resource

import (
	"fmt"
	"log"
	"strings"

	_resource "github.com/sst/sst/v3/sdk/golang/resource"
)

type PathError struct {
	Path []string
	Err  error
}

func (e *PathError) Error() string {
	return fmt.Sprintf("%s: %s", strings.Join(e.Path, "."), e.Err.Error())
}

func Get[TValue any](path ...string) (TValue, error) {
	var zero TValue

	val, err := _resource.Get(path...)
	if err != nil {
		log.Printf("failed to get resource: %s", err.Error())
		return zero, &PathError{Path: path, Err: err}
	}

	casted, ok := val.(TValue)
	if !ok {
		err := fmt.Errorf("resource type assertion failed")
		log.Printf(err.Error())
		return zero, &PathError{Path: path, Err: err}
	}

	return casted, nil
}
