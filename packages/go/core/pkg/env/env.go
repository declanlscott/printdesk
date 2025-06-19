package env

import (
	"fmt"
	"os"
)

func Get(key string) (*string, error) {
	value, ok := os.LookupEnv(key)
	if !ok {
		return nil, fmt.Errorf("$%s not set", key)
	}

	return &value, nil
}
