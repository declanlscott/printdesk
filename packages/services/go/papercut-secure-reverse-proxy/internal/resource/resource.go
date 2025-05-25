package resource

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
)

var resources map[string]any

func init() {
	b64Key, ok := os.LookupEnv("CUSTOM_SST_KEY")
	if !ok {
		panic("Missing CUSTOM_SST_KEY environment variable")
	}

	key, err := base64.StdEncoding.DecodeString(b64Key)
	if err != nil {
		panic(err)
	}

	resourceFileName, ok := os.LookupEnv("CUSTOM_SST_KEY_FILE")
	if !ok {
		panic("Missing CUSTOM_SST_KEY_FILE environment variable")
	}

	ciphertext, err := os.ReadFile(resourceFileName)
	if err != nil {
		panic(err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		panic(err)
	}

	aesGcm, err := cipher.NewGCM(block)
	if err != nil {
		panic(err)
	}

	plaintext, err := aesGcm.Open(
		nil,
		make([]byte, 12),
		append(ciphertext[:len(ciphertext)-16], ciphertext[len(ciphertext)-16:]...),
		nil,
	)
	if err != nil {
		panic(err)
	}

	if err := json.Unmarshal(plaintext, &resources); err != nil {
		panic(err)
	}
}

var ErrNotFound = errors.New("not found")

func Get(path ...string) (any, error) {
	return get(resources, path...)
}

func All() map[string]any {
	return resources
}

func get(input any, path ...string) (any, error) {
	if len(path) == 0 {
		return input, nil
	}

	casted, ok := input.(map[string]any)
	if !ok {
		return nil, ErrNotFound
	}

	next, ok := casted[path[0]]
	if !ok {
		return nil, ErrNotFound
	}

	return get(next, path[1:]...)
}
