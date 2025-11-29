<?php

namespace Tests;

use Facebook\WebDriver\Chrome\ChromeOptions;
use Facebook\WebDriver\Remote\DesiredCapabilities;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use Laravel\Dusk\TestCase as BaseTestCase;
use PHPUnit\Framework\Attributes\BeforeClass;

abstract class DuskTestCase extends BaseTestCase
{
    /**
     * Prepare for Dusk test execution.
     */
    #[BeforeClass]
    public static function prepare(): void
    {
        if (! static::runningInSail()) {
            static::startChromeDriver(['--port=9515']);
        }
    }

    /**
     *Create the RemoteWebDriver instance.
    */
    protected function driver(): RemoteWebDriver
    {
        $options = (new ChromeOptions)->addArguments([
            '--window-size=1920,1080',
            '--disable-search-engine-choice-screen',
            '--disable-gpu',
        ]);

        if (env('DUSK_DRIVER_URL')) {
            $options->addArguments([
                '--headless=new',
                '--no-sandbox',
                '--disable-dev-shm-usage',
            ]);

            return RemoteWebDriver::create(
                env('DUSK_DRIVER_URL'),
                $options
            );
        }

        return RemoteWebDriver::create(
            'http://localhost:9515',
            $options
        );
    }
}
