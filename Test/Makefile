# Makefile pour les tests unitaires de la réserve batterie Zendure
#
# Ce Makefile permet de compiler et exécuter les tests unitaires
# sans dépendre de l'environnement ESP32.

# Configuration
CXX = g++
CXXFLAGS = -std=c++11 -Wall -Wextra -pedantic -g
TARGET = test_reserve_batterie

# Cibles
all: $(TARGET)

$(TARGET): $(TARGET).cpp ../ZendureReserve.h ../GestionOverproductionBody.inc
	$(CXX) $(CXXFLAGS) -o $@ $<

test: $(TARGET)
	@echo "Exécution des tests unitaires..."
	./$(TARGET)

run: test

clean:
	rm -f $(TARGET)
	rm -f *.o

.PHONY: all test run clean