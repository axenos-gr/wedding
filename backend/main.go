package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()
	router.GET("/health", health)

	router.Run("0.0.0.0:6000")
}

func health(c *gin.Context) {
	c.String(200, "I'm alive")
}
