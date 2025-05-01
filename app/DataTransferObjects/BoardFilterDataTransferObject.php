<?php

namespace App\DataTransferObjects;

use Carbon\Carbon;
use PHPUnit\Event\RuntimeException;

class BoardFilterDataTransferObject
{
    /**
     * @property int $boardId
     */
    protected int $boardId;

    /**
     * @property ?Carbon $dateFrom;
     */
    protected ?Carbon $dateFrom;

    /**
     * @property ?Carbon $dateTo;
     */
    protected ?Carbon $dateTo;

    /**
     * @property string $filterColumn
     */
    protected string $filterColumn = 'created_at';

    /**
     * @property int $boardId
     * @property ?Carbon $dateFrom;
     * @property ?Carbon $dateTo;
     * @property string $filterColumn;
     */
    public function __construct($dataArray = [])
    {
        if (empty($dataArray)) {
            return $this;
        }

        $this->hydrate($dataArray);
        return $this;
    }

    public function getBoardId(): int
    {
        return $this->boardId;
    }

    public function setBoardId(int $boardId): void
    {
        $this->boardId = $boardId;
    }

    public function getDateFrom(): ?Carbon
    {
        return $this->dateFrom;
    }

    public function setDateFrom(?Carbon $dateFrom): void
    {
        $this->dateFrom = $dateFrom;
    }

    public function getDateTo(): ?Carbon
    {
        return $this->dateTo;
    }

    public function setDateTo(?Carbon $dateTo): void
    {
        $this->dateTo = $dateTo;
    }

    public function getFilterColumn(): string
    {
        return $this->filterColumn;
    }

    public function setFilterColumn(string $filterColumn): void
    {
        $this->filterColumn = $filterColumn;
    }

    public function hydrate(mixed $dataArray): void
    {
        $fields = array_keys(get_class_vars(self::class));
        foreach ($fields as $field) {

            if (!array_key_exists($field, $dataArray)) {
                throw new RuntimeException('Attempted to hydrate with fragmented data');
            }

            $setter = 'set' . ucfirst($field);
            $this->$setter($dataArray[$field]);
        }
    }
}
