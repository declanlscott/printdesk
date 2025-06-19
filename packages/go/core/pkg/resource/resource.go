package resource

import (
	"encoding/json"
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

func Get(path ...string) (any, error) {
	resource, err := _resource.Get(path...)

	if err != nil {
		log.Printf("failed to get resource: %s", err.Error())

		return nil, &PathError{Path: path, Err: err}
	}

	return resource, nil
}

func Unmarshal[TResource any](name string) (*TResource, error) {
	mapData, err := Get(name)
	if err != nil {
		return nil, err
	}

	jsonData, err := json.Marshal(mapData)
	if err != nil {
		return nil, err
	}

	var resource TResource
	if err := json.Unmarshal(jsonData, &resource); err != nil {
		return nil, err
	}

	return &resource, nil
}
